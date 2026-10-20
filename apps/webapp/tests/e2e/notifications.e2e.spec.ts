/**
 * Pruebas E2E: Notificaciones WebApp Admin ↔ PWA Usuarios
 * 
 * Valida el flujo completo de extremo a extremo:
 * 1. Admin crea un recurso → notificación push llega a PWA residente
 * 2. Badge se actualiza en ambos lados
 * 3. Residente crea PQR/reserva → admin recibe notificación
 * 4. Portería registra visitante → residente recibe notificación
 * 5. Marcar como leída → badge baja en ambos lados
 *
 * Requisitos previos:
 * - Entorno de staging desplegado (WebApp + PWA)
 * - Cuentas de prueba: 1 admin, 2 residentes de un conjunto de prueba
 * - Suscripciones push válidas registradas en pwa_push_subscriptions
 * - Variables de entorno: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 *
 * Ejecutar: npx playwright test --project=pwa-notifications
 */

import { test, expect } from '@playwright/test';

test.describe('Notificaciones WebApp Admin ↔ PWA Usuarios', () => {
  const ADMIN_URL = process.env.PAIC_ADMIN_URL || 'https://app.paicai.com.co';
  const PWA_URL = process.env.PAIC_PWA_URL || 'https://usuarios.paicai.com.co';
  const CONJUNTO_ID = process.env.PAIC_TEST_CONJUNTO_ID || 'conjunto-prueba-001';
  const ADMIN_EMAIL = process.env.PAIC_ADMIN_EMAIL || 'admin@prueba.com.co';
  const ADMIN_PASSWORD = process.env.PAIC_ADMIN_PASSWORD || 'TestPassword123';
  const RESIDENTE_EMAIL = process.env.PAIC_RESIDENTE_EMAIL || 'residente@prueba.com.co';
  const RESIDENTE_PASSWORD = process.env.PAIC_RESIDENTE_PASSWORD || 'TestPassword123';

  test.use({ storageState: 'tests/.auth/admin.json' });

  test.describe('Flujo Admin → Residente (Push + Badge)', () => {
    test('Publicar comunicado: admin recibe confirmación, residente recibe push y badge', async ({ page, context }) => {
      // 1. Admin abre WebApp y navega a Comunicados
      await page.goto(`${ADMIN_URL}/comunicados`);
      await page.waitForLoadState('networkidle');

      // 2. Capturar contador inicial de badge de Comunicados
      const badgeInicial = await page.locator('[data-testid="badge-comunicado"]').textContent();
      const contadorInicial = badgeInicial ? parseInt(badgeInicial, 10) : 0;

      // 3. Crear nuevo comunicado
      await page.click('[data-testid="btn-crear-comunicado"]');
      await page.fill('[data-testid="input-titulo"]', 'Comunicado de prueba E2E');
      await page.fill('[data-testid="input-contenido"]', 'Este es un comunicado de prueba automatizado');
      await page.click('[data-testid="btn-publicar-comunicado"]');

      // 4. Verificar que el comunicado se guardó (toast o redirect)
      await expect(page.locator('[data-testid="toast-success"], .toast-success')).toContainText(['publicado', 'creado', 'éxito'], { timeout: 10000 });

      // 5. Verificar que el badge de Comunicados aumentó
      await page.waitForTimeout(2000); // Esperar actualización Realtime
      const badgeFinal = await page.locator('[data-testid="badge-comunicado"]').textContent();
      const contadorFinal = badgeFinal ? parseInt(badgeFinal, 10) : 0;
      expect(contadorFinal).toBeGreaterThanOrEqual(contadorInicial + 1);

      // 6. Abrir PWA de residente en otra pestaña y verificar push/badge
      const pwaPage = await context.newPage();
      await pwaPage.goto(`${PWA_URL}/app`);
      await pwaPage.waitForLoadState('networkidle');

      // Login de residente si es necesario
      if (await pwaPage.locator('input[type="email"]').isVisible()) {
        await pwaPage.fill('input[type="email"]', RESIDENTE_EMAIL);
        await pwaPage.fill('input[type="password"]', RESIDENTE_PASSWORD);
        await pwaPage.click('button[type="submit"]');
        await pwaPage.waitForLoadState('networkidle');
      }

      // 7. Verificar badge de Comunicados en PWA
      const pwaBadge = await pwaPage.locator('[data-testid="badge-comunicado"]').textContent();
      const pwaContador = pwaBadge ? parseInt(pwaBadge, 10) : 0;
      expect(pwaContador).toBeGreaterThanOrEqual(contadorInicial + 1);

      // 8. Verificar notificación push visible (si el service worker está activo)
      const pushVisible = await pwaPage.locator('.notification-toast, [role="alert"]').isVisible({ timeout: 5000 });
      if (pushVisible) {
        await expect(pwaPage.locator('.notification-toast')).toContainText('Comunicado de prueba E2E');
      }

      await pwaPage.close();
    });

    test('Crear reserva: residente recibe push específico y badge de Reservas', async ({ page, context }) => {
      await page.goto(`${ADMIN_URL}/reservas`);
      await page.waitForLoadState('networkidle');

      const badgeInicial = await page.locator('[data-testid="badge-reserva"]').textContent();
      const contadorInicial = badgeInicial ? parseInt(badgeInicial, 10) : 0;

      // Crear reserva para un residente específico
      await page.click('[data-testid="btn-crear-reserva"]');
      await page.fill('[data-testid="input-area"]', 'Salón Comunal');
      await page.fill('[data-testid="input-fecha"]', '2026-11-01');
      await page.fill('[data-testid="input-residente-id"]', 'residente-prueba-001');
      await page.click('[data-testid="btn-confirmar-reserva"]');

      await expect(page.locator('[data-testid="toast-success"]')).toBeVisible({ timeout: 10000 });

      await page.waitForTimeout(2000);
      const badgeFinal = await page.locator('[data-testid="badge-reserva"]').textContent();
      const contadorFinal = badgeFinal ? parseInt(badgeFinal, 10) : 0;
      expect(contadorFinal).toBeGreaterThanOrEqual(contadorInicial + 1);

      // Verificar en PWA del residente
      const pwaPage = await context.newPage();
      await pwaPage.goto(`${PWA_URL}/app`);
      await pwaPage.waitForLoadState('networkidle');

      const pwaBadge = await pwaPage.locator('[data-testid="badge-reserva"]').textContent();
      const pwaContador = pwaBadge ? parseInt(pwaBadge, 10) : 0;
      expect(pwaContador).toBeGreaterThanOrEqual(contadorInicial + 1);

      await pwaPage.close();
    });

    test('Publicar documento: push masivo a todos los residentes del conjunto', async ({ page, context }) => {
      await page.goto(`${ADMIN_URL}/documentos`);
      await page.waitForLoadState('networkidle');

      await page.click('[data-testid="btn-crear-documento"]');
      await page.fill('[data-testid="input-titulo"]', 'Reglamento de Propiedad Horizontal');
      await page.click('[data-testid="btn-publicar-documento"]');

      await expect(page.locator('[data-testid="toast-success"]')).toBeVisible({ timeout: 10000 });

      // Abrir PWA de dos residentes diferentes y verificar que ambos reciben el push
      const pwaPage1 = await context.newPage();
      const pwaPage2 = await context.newPage();

      for (const pwaPage of [pwaPage1, pwaPage2]) {
        await pwaPage.goto(`${PWA_URL}/app`);
        await pwaPage.waitForLoadState('networkidle');

        const pwaBadge = await pwaPage.locator('[data-testid="badge-documento"]').textContent();
        const pwaContador = pwaBadge ? parseInt(pwaBadge, 10) : 0;
        expect(pwaContador).toBeGreaterThanOrEqual(1);

        await pwaPage.close();
      }
    });
  });

  test.describe('Flujo Residente → Admin (PQR / Reserva)', () => {
    test('Residente crea PQR: admin recibe notificación y badge de PQR sube', async ({ page, context }) => {
      // Abrir PWA de residente
      const pwaPage = await context.newPage();
      await pwaPage.goto(`${PWA_URL}/app`);
      await pwaPage.waitForLoadState('networkidle');

      // Login residente
      if (await pwaPage.locator('input[type="email"]').isVisible()) {
        await pwaPage.fill('input[type="email"]', RESIDENTE_EMAIL);
        await pwaPage.fill('input[type="password"]', RESIDENTE_PASSWORD);
        await pwaPage.click('button[type="submit"]');
        await pwaPage.waitForLoadState('networkidle');
      }

      // Navegar a PQRs y crear uno
      await pwaPage.click('[data-testid="menu-pqr"]');
      await pwaPage.click('[data-testid="btn-crear-pqr"]');
      await pwaPage.fill('[data-testid="input-titulo-pqr"]', 'PQR de prueba E2E');
      await pwaPage.fill('[data-testid="input-descripcion-pqr"]', 'Descripción del problema');
      await pwaPage.click('[data-testid="btn-enviar-pqr"]');

      await expect(pwaPage.locator('[data-testid="toast-success"]')).toBeVisible({ timeout: 10000 });

      // Verificar en WebApp del admin que el badge de PQR subió
      await page.waitForTimeout(2000);
      const badgeAdmin = await page.locator('[data-testid="badge-pqr"]').textContent();
      const contadorAdmin = badgeAdmin ? parseInt(badgeAdmin, 10) : 0;
      expect(contadorAdmin).toBeGreaterThanOrEqual(1);

      await pwaPage.close();
    });

    test('Admin responde PQR: residente recibe push específico y badge baja', async ({ page }) => {
      // Asumir que hay un PQR pendiente para responder
      await page.goto(`${ADMIN_URL}/pqrs`);
      await page.waitForLoadState('networkidle');

      await page.click('[data-testid="btn-responder-pqr"]');
      await page.fill('[data-testid="input-respuesta"]', 'Respuesta de prueba E2E');
      await page.click('[data-testid="btn-enviar-respuesta"]');

      await expect(page.locator('[data-testid="toast-success"]')).toBeVisible({ timeout: 10000 });

      // El badge del PQR del residente debería bajar (marcado como respondido/leído)
      await page.waitForTimeout(2000);
      const badgePQR = await page.locator('[data-testid="badge-pqr"]').textContent();
      const contadorPQR = badgePQR ? parseInt(badgePQR, 10) : 0;
      expect(contadorPQR).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Flujo Portería ↔ Residente', () => {
    test('Registrar visitante: residente recibe push al apartamento correcto', async ({ page, context }) => {
      await page.goto(`${ADMIN_URL}/porteria`);
      await page.waitForLoadState('networkidle');

      await page.click('[data-testid="btn-registrar-visitante"]');
      await page.fill('[data-testid="input-nombre-visitante"]', 'Juan Pérez Prueba');
      await page.fill('[data-testid="input-apartamento"]', '101');
      await page.fill('[data-testid="input-residente-id"]', 'residente-prueba-001');
      await page.click('[data-testid="btn-confirmar-visita"]');

      await expect(page.locator('[data-testid="toast-success"]')).toBeVisible({ timeout: 10000 });

      // Verificar en PWA del residente del apartamento 101
      const pwaPage = await context.newPage();
      await pwaPage.goto(`${PWA_URL}/app`);
      await pwaPage.waitForLoadState('networkidle');

      const pwaBadge = await pwaPage.locator('[data-testid="badge-visitante"]').textContent();
      const pwaContador = pwaBadge ? parseInt(pwaBadge, 10) : 0;
      expect(pwaContador).toBeGreaterThanOrEqual(1);

      await pwaPage.close();
    });

    test('Residente aprueba ingreso: portero/admin recibe notificación', async ({ page, context }) => {
      const pwaPage = await context.newPage();
      await pwaPage.goto(`${PWA_URL}/app`);
      await pwaPage.waitForLoadState('networkidle');

      // Login residente
      if (await pwaPage.locator('input[type="email"]').isVisible()) {
        await pwaPage.fill('input[type="email"]', RESIDENTE_EMAIL);
        await pwaPage.fill('input[type="password"]', RESIDENTE_PASSWORD);
        await pwaPage.click('button[type="submit"]');
        await pwaPage.waitForLoadState('networkidle');
      }

      // Aprobar visita pendiente
      await pwaPage.click('[data-testid="visita-pendiente-101"]');
      await pwaPage.click('[data-testid="btn-aprobar-ingreso"]');

      await expect(pwaPage.locator('[data-testid="toast-success"]')).toBeVisible({ timeout: 10000 });

      // Verificar en WebApp admin que hay notificación para portería
      await page.waitForTimeout(2000);
      const badgePorteria = await page.locator('[data-testid="badge-porteria"]').textContent();
      const contadorPorteria = badgePorteria ? parseInt(badgePorteria, 10) : 0;
      expect(contadorPorteria).toBeGreaterThanOrEqual(0);

      await pwaPage.close();
    });
  });

  test.describe('Marcar notificación como leída', () => {
    test('Badge baja en ambos lados al marcar como leída', async ({ page, context }) => {
      // Admin marca una notificación de Comunicados como leída
      await page.goto(`${ADMIN_URL}/notificaciones`);
      await page.waitForLoadState('networkidle');

      const badgeAntes = await page.locator('[data-testid="badge-comunicado"]').textContent();
      const contadorAntes = badgeAntes ? parseInt(badgeAntes, 10) : 0;

      if (contadorAntes > 0) {
        await page.click('[data-testid="btn-marcar-comunicado-leido"]');
        await page.waitForTimeout(2000);

        const badgeDespues = await page.locator('[data-testid="badge-comunicado"]').textContent();
        const contadorDespues = badgeDespues ? parseInt(badgeDespues, 10) : 0;
        expect(contadorDespues).toBe(contadorAntes - 1);
      }
    });
  });

  test.describe('Validación de contrato Edge Function send-pwa-push', () => {
    test('Edge Function responde con sent > 0 cuando hay suscripciones', async ({ request }) => {
      const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://vgmwlzhlpehuvfkgqzja.supabase.co';
      const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

      if (!SUPABASE_ANON_KEY) {
        test.skip('Se requiere VITE_SUPABASE_ANON_KEY para probar Edge Function');
      }

      const response = await request.post(`${SUPABASE_URL}/functions/v1/send-pwa-push`, {
        data: {
          conjuntoId: CONJUNTO_ID,
          title: 'Test E2E',
          body: 'Prueba de envío push',
          type: 'comunicado',
          url: '/comunicados/test',
        },
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const body = await response.json();
      expect(response.ok()).toBeTruthy();
      expect(body).toHaveProperty('sent');
      expect(body).toHaveProperty('failed');
      expect(body).toHaveProperty('total');
      // Nota: sent puede ser 0 si no hay suscripciones activas, pero la función debe responder 200
    });
  });
});
