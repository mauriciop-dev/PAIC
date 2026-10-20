/**
 * Script de validación rápida: Notificaciones WebApp ↔ PWA
 * Ejecutar: node scripts/validar-notificaciones.mjs
 * 
 * Verifica que los archivos de implementación existen y tienen el contenido esperado.
 * No requiere conexión a Supabase ni entorno desplegado.
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const CHECKS = [];

function check(nombre, condicion, detalle = '') {
  CHECKS.push({ nombre, pasa: Boolean(condicion), detalle });
  const icono = condicion ? '✅' : '❌';
  console.log(`${icono} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
}

// ============================================================
// 1. Archivos de implementación core
// ============================================================
console.log('\n📁 ARCHIVOS DE IMPLEMENTACIÓN CORE\n');

check(
  'notificationService.ts (servicio central)',
  fs.existsSync(path.join(ROOT, 'apps/webapp/services/notificationService.ts')),
  'Envía notificaciones, guarda en BD, publica Realtime, envía push'
);

check(
  'useNotifications.ts (hook tiempo real)',
  fs.existsSync(path.join(ROOT, 'apps/webapp/hooks/useNotifications.ts')),
  'Suscripción a canal Realtime, contadores de badge, setAppBadge'
);

check(
  'useNotificationTrigger.ts (hook disparador)',
  fs.existsSync(path.join(ROOT, 'apps/webapp/hooks/useNotificationTrigger.ts')),
  'Funciones específicas por módulo: comunicado, reserva, PQR, documento, etc.'
);

check(
  'ModuleBadgeEnhanced.tsx (componente badge)',
  fs.existsSync(path.join(ROOT, 'apps/webapp/components/ModuleBadgeEnhanced.tsx')),
  'Badge en tiempo real con setAppBadge'
);

check(
  'ModuleBadge.tsx (componente badge legacy)',
  fs.existsSync(path.join(ROOT, 'apps/webapp/components/ModuleBadge.tsx')),
  'Badge con polling cada 30s'
);

check(
  'sw.js (Service Worker WebApp)',
  fs.existsSync(path.join(ROOT, 'apps/webapp/public/sw.js')),
  'Maneja push, notificationclick, setAppBadge'
);

check(
  'sw-enhanced.js (Service Worker mejorado)',
  fs.existsSync(path.join(ROOT, 'apps/webapp/public/sw-enhanced.js')),
  'Versión mejorada del SW con navegación desde notificación'
);

check(
  'send-pwa-push/index.ts (Edge Function)',
  fs.existsSync(path.join(ROOT, 'apps/webapp/supabase/functions/send-pwa-push/index.ts')),
  'Envía notificaciones push vía Web Push API'
);

check(
  'notifications.ts (utilidad alternativa)',
  fs.existsSync(path.join(ROOT, 'apps/webapp/utils/notifications.ts')),
  'notifyPwaResidents y getUnreadCount'
);

// ============================================================
// 2. Archivos de PWA de usuarios
// ============================================================
console.log('\n📱 ARCHIVOS PWA USUARIOS\n');

check(
  'apps/usuarios/public/manifest.json',
  fs.existsSync(path.join(ROOT, 'apps/usuarios/public/manifest.json')),
  'Manifest de la PWA de residentes'
);

check(
  'apps/usuarios/public/sw.js',
  fs.existsSync(path.join(ROOT, 'apps/usuarios/public/sw.js')),
  'Service Worker de la PWA de residentes (usa self.localStorage — PROBLEMA)'
);

check(
  'apps/webapp/public/manifest.json',
  fs.existsSync(path.join(ROOT, 'apps/webapp/public/manifest.json')),
  'Manifest de la WebApp admin'
);

// ============================================================
// 3. Documentación y migraciones
// ============================================================
console.log('\n📚 DOCUMENTACIÓN Y MIGRACIONES\n');

check(
  'GUIA_IMPLEMENTACION_NOTIFICACIONES.md',
  fs.existsSync(path.join(ROOT, 'GUIA_IMPLEMENTACION_NOTIFICACIONES.md')),
  'Guía completa de implementación'
);

check(
  'IMPLEMENTACION_INMEDIATA.md',
  fs.existsSync(path.join(ROOT, 'IMPLEMENTACION_INMEDIATA.md')),
  'Pasos inmediatos de implementación'
);

check(
  'PAIC_PLAN_NOTIFICACIONES.md',
  fs.existsSync(path.join(ROOT, 'PAIC_PLAN_NOTIFICACIONES.md')),
  'Plan diagnóstico y de notificaciones'
);

check(
  'PAIC_FASE5_PLAN_VALIDACION.md',
  fs.existsSync(path.join(ROOT, 'PAIC_FASE5_PLAN_VALIDACION.md')),
  'Plan de validación por etapas (Fase 5)'
);

check(
  'supabase-migrations-create-notifications-table.sql',
  fs.existsSync(path.join(ROOT, 'supabase-migrations-create-notifications-table.sql')),
  'SQL para crear tabla notifications'
);

// ============================================================
// 4. Pruebas existentes
// ============================================================
console.log('\n🧪 PRUEBAS EXISTENTES\n');

check(
  'notificationService.test.ts (unitario)',
  fs.existsSync(path.join(ROOT, 'apps/webapp/services/__tests__/notificationService.test.ts')),
  'Pruebas unitarias del servicio de notificaciones (NUEVO)'
);

check(
  'useNotifications.integration.test.ts (integración)',
  fs.existsSync(path.join(ROOT, 'apps/webapp/hooks/__tests__/useNotifications.integration.test.ts')),
  'Pruebas de integración del hook (NUEVO)'
);

check(
  'notifications.e2e.spec.ts (E2E Playwright)',
  fs.existsSync(path.join(ROOT, 'apps/webapp/tests/e2e/notifications.e2e.spec.ts')),
  'Pruebas E2E WebApp ↔ PWA (NUEVO)'
);

check(
  'playwright.notifications.config.ts',
  fs.existsSync(path.join(ROOT, 'apps/webapp/playwright.notifications.config.ts')),
  'Configuración Playwright para notificaciones (NUEVO)'
);

check(
  'pwaPush.test.ts (PWA usuarios)',
  fs.existsSync(path.join(ROOT, 'apps/usuarios/src/services/__tests__/pwaPush.test.ts')),
  'Pruebas unitarias del payload de push PWA'
);

// ============================================================
// 5. Contenido crítico de código (detección de problemas)
// ============================================================
console.log('\n⚠️ DETECCIÓN DE PROBLEMAS CONOCIDOS\n');

const swUsuarios = fs.existsSync(path.join(ROOT, 'apps/usuarios/public/sw.js'))
  ? fs.readFileSync(path.join(ROOT, 'apps/usuarios/public/sw.js'), 'utf-8')
  : '';

check(
  'SW de usuarios NO usa self.localStorage (incompatible con SW)',
  !swUsuarios.includes('self.localStorage'),
  'self.localStorage no existe en Service Workers — usar mensajes o Supabase'
);

const usePWA = fs.existsSync(path.join(ROOT, 'usePWAServiceWorker.ts'))
  ? fs.readFileSync(path.join(ROOT, 'usePWAServiceWorker.ts'), 'utf-8')
  : '';

check(
  'usePWAServiceWorker.ts NO tiene VAPID hardcodeada',
  !usePWA.includes('BJqgBW6Wt9mXQJr3kD5G6H7I8J9K0L1M2N3O4P5Q6R7S8T9U0V1W2X3Y4Z5'),
  'Clave VAPID debe estar en secretos de servidor, no en frontend'
);

const notifService = fs.existsSync(path.join(ROOT, 'apps/webapp/services/notificationService.ts'))
  ? fs.readFileSync(path.join(ROOT, 'apps/webapp/services/notificationService.ts'), 'utf-8')
  : '';

check(
  'notificationService.ts usa columnas referencia_recurso / tipo_recurso',
  notifService.includes('referencia_recurso') && notifService.includes('tipo_recurso'),
  'Verificar que estas columnas existan en la tabla notifications de Supabase'
);

const edgeFunc = fs.existsSync(path.join(ROOT, 'apps/webapp/supabase/functions/send-pwa-push/index.ts'))
  ? fs.readFileSync(path.join(ROOT, 'apps/webapp/supabase/functions/send-pwa-push/index.ts'), 'utf-8')
  : '';

check(
  'Edge Function filtra pwa_push_subscriptions por conjunto_id',
  edgeFunc.includes("eq('conjunto_id', conjuntoId)"),
  'Verificar que pwa_push_subscriptions tenga columna conjunto_id'
);

check(
  'Edge Function NO acepta claves VAPID en el body (inseguro)',
  !edgeFunc.includes('vapidPublicKey') || !edgeFunc.includes('vapidPrivateKey'),
  'Las claves VAPID deben venir solo de Deno.env (secretos de Supabase)'
);

// ============================================================
// RESUMEN
// ============================================================
console.log('\n' + '='.repeat(60));
const total = CHECKS.length;
const pasados = CHECKS.filter(c => c.pasa).length;
const fallidos = CHECKS.filter(c => !c.pasa).length;
console.log(`RESULTADO: ${pasados}/${total} verificaciones pasadas`);
console.log(`Fallidos: ${fallidos}`);

if (fallidos > 0) {
  console.log('\n⚠️  VERIFICACIONES FALLIDAS:');
  CHECKS.filter(c => !c.pasa).forEach(c => console.log(`   - ${c.nombre}: ${c.detalle}`));
}

console.log('\n📋 PRÓXIMO PASO:');
console.log('   Ejecutar: pnpm --filter webapp test');
console.log('   Ejecutar E2E: npx playwright test --config apps/webapp/playwright.notifications.config.ts');
console.log('='.repeat(60) + '\n');

process.exit(fallidos > 0 ? 1 : 0);
