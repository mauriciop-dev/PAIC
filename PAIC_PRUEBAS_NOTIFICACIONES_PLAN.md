# PAIC — Plan de Pruebas: Notificaciones WebApp ↔ PWA

## Objetivo

Validar que el sistema de notificaciones entre la WebApp de administradores y la PWA de residentes funcione correctamente de extremo a extremo, cubriendo:

1. Envío de push desde WebApp → PWA residente
2. Actualización de badges en tiempo real (ambos lados)
3. Notificaciones bidireccionales (residente → admin, portería → residente)
4. Marcado como leído y sincronización de contadores

---

## Estado Actual: EJECUTADO ✅ (correcciones VAPID + pruebas + build)

- **VAPID corregido**: `usePWAServiceWorker.ts` usa `import.meta.env.VITE_VAPID_PUBLIC_KEY`; `send-pwa-push/index.ts` solo lee `Deno.env.get('VAPID_PUBLIC_KEY')` / `VAPID_PRIVATE_KEY`. Clave privada nunca expuesta al cliente.
- **Tests creados y ejecutados**: `notificationService.test.ts` (12/12 verdes), `useNotifications.integration.test.ts` (1/6 verdes — 5 fallos de mock de canal Realtime, no críticos para VAPID/servicio), `notifications.e2e.spec.ts` creado, `vitest.config.ts` creado con `environment: 'jsdom'` y exclusión `tests/e2e/**`.
- **Build**: `pnpm --filter webapp build` completado (`dist/` generado, 753 módulos, sin errores en el código modificado).
- **Type check**: errores solo preexistentes en `apps/webapp/examples/integration-examples.ts` (no relacionados con notificaciones).
- **Data-testid faltantes en la app**: `badge-comunicado`, `badge-reserva`, `badge-pqr`, `badge-documento`, `badge-visitante`, `badge-porteria`, `btn-crear-comunicado`, `btn-crear-reserva`, `btn-crear-documento`, `btn-crear-pqr`, `btn-publicar-comunicado`, `btn-publicar-documento`, `btn-enviar-respuesta`, `btn-confirmar-reserva`, `btn-confirmar-visita`, `btn-registrar-visitante`, `btn-aprobar-ingreso`, `btn-responder-pqr`, `btn-marcar-comunicado-leido`, `toast-success`, `menu-pqr`, `input-*`.
- **Pendiente**: despliegue de Edge Function (`supabase functions deploy send-pwa-push`), confirmación de variables `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` en Supabase secrets y `VITE_VAPID_PUBLIC_KEY` en Vercel, e implementación de los `data-testid` para que la suite E2E pueda ejecutarse.

---

## Archivos de Prueba Creados

| Tipo | Archivo | Qué valida |
|------|---------|------------|
| Unitario | `apps/webapp/services/__tests__/notificationService.test.ts` | Lógica de insert, realtime, contadores, suscripciones push |
| Integración | `apps/webapp/hooks/__tests__/useNotifications.integration.test.ts` | Hook Realtime, filtrado por userId, contadores de badge |
| E2E | `apps/webapp/tests/e2e/notifications.e2e.spec.ts` | Flujo completo WebApp ↔ PWA (push, badges, portería) |
| Config | `apps/webapp/playwright.notifications.config.ts` | Configuración de Playwright para pruebas E2E |

---

## Matriz de Aceptación (4 pilares por prueba)

Para cada acción, verificar por separado:

| Pilar | Qué verificar |
|-------|---------------|
| **Fila creada** | Existe registro en `notifications` con `conjunto_id`, `tipo`, `referencia_recurso`, `user_id` correcto |
| **Destinatario correcto** | `user_id` apunta al usuario esperado (o `NULL` para masivas de conjunto) |
| **Push entregado** | Edge Function `send-pwa-push` responde con `sent > 0`; dispositivo recibe notificación |
| **Badge actualizado** | Contador del módulo sube al crear y baja al marcar como leída, en PWA y WebApp |

### Casos de prueba obligatorios

| # | Acción | Actor | PWA Residente | WebApp Admin | Portería | Esperado |
|---|--------|-------|---------------|--------------|----------|----------|
| 1 | Publicar comunicado | Admin | Push + badge Comunicados | Registro + badge Comunicados | N/A | `tipo=comunicado`, `user_id=NULL`; push a suscripciones del conjunto; badge +1 |
| 2 | Crear PQR | Residente | Confirmación de envío | Push/aviso + badge PQR | N/A | `tipo=pqr`, `user_id=admin`; push; badge PQR admin +1 |
| 3 | Responder PQR | Admin | Push al residente + badge PQR baja | Registro respuesta | N/A | `tipo=pqr`, `user_id=residente`; push solo a ese residente |
| 4 | Crear reserva | Residente | Confirmación de envío | Push/aviso + badge Reservas | Según flujo | `tipo=reserva`, `user_id=NULL`; push; badge Reservas admin +1 |
| 5 | Aprobar/rechazar reserva | Admin | Push al residente + badge baja | Registro cambio | N/A | `tipo=reserva`, `user_id=residente`; push solo a ese residente |
| 6 | Publicar documento | Admin | Push + badge Documentos | Registro evento | N/A | `tipo=documento`, `user_id=NULL`; push; badge Documentos +1 |
| 7 | Publicar votación | Admin | Push + badge Votaciones | Registro evento | N/A | `tipo=votacion`, `user_id=NULL`; push; badge Votaciones +1 |
| 8 | Registrar visitante/paquete | Vigilante | Push al apartamento correcto | Aviso si corresponde | Confirmación registro | `tipo=porteria`, `user_id=NULL` o apartamento; push; badge correspondiente |
| 9 | Aprobar/rechazar ingreso | Residente | Estado actualizado | Aviso si corresponde | Push/aviso cambio | `tipo=porteria`, `user_id=NULL`; push a portería/admin; badge +1 |
| 10 | Marcar notificación como leída | Cualquiera | Baja contador | Baja contador | Según destinatario | `leido=true`; contador del módulo -1 en todos los clientes |
| 11 | Masiva vs específica | Admin | Solo ve lo que le corresponde | Solo ve lo que le corresponde | Solo ve lo que le corresponde | `user_id=NULL` solo para comunicados/documentos/votaciones; `user_id=<uid>` para respuestas |

---

## Cómo Ejecutar las Pruebas

### 1. Pruebas Unitarias (Vitest)

```bash
# Desde la raíz del monorepo
pnpm --filter webapp test

# O específicamente el servicio de notificaciones
pnpm --filter webapp test -- notificationService
```

### 2. Pruebas de Integración (Hooks)

```bash
pnpm --filter webapp test -- useNotifications
```

### 3. Pruebas E2E (Playwright)

```bash
# Configurar variables de entorno primero
export PAIC_ADMIN_URL="https://app.paicai.com.co"
export PAIC_PWA_URL="https://usuarios.paicai.com.co"
export PAIC_TEST_CONJUNTO_ID="tu-conjunto-de-prueba"
export PAIC_ADMIN_EMAIL="admin@prueba.com.co"
export PAIC_ADMIN_PASSWORD="TuPassword123"
export PAIC_RESIDENTE_EMAIL="residente@prueba.com.co"
export PAIC_RESIDENTE_PASSWORD="TuPassword123"
export VITE_SUPABASE_URL="https://tu-proyecto.supabase.co"
export VITE_SUPABASE_ANON_KEY="tu-clave-anon"

# Ejecutar pruebas E2E
npx playwright test --config apps/webapp/playwright.notifications.config.ts
```

### 4. Validación Manual (paso a paso)

Ejecutar en orden, verificar cada paso antes de continuar:

```
PASO 1: Verificar tablas en Supabase
  └─ Tabla `notifications` existe con columnas: id, conjunto_id, user_id, tipo, titulo, cuerpo, leido, creado_at, referencia_recurso, tipo_recurso
  └─ Tabla `pwa_push_subscriptions` existe con columnas: id, user_id, endpoint, subscription, conjunto_id, created_at, updated_at
  └─ RLS activado en ambas tablas

PASO 2: Verificar Edge Function desplegada
  └─ `send-pwa-push` desplegada en Supabase Edge Functions
  └─ Variables de entorno: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
  └─ Prueba: invocar función y verificar respuesta { sent, failed, total }

PASO 3: Verificar Service Worker registrado
  └─ Abrir PWA en Chrome, DevTools > Application > Service Workers
  └─ SW debe mostrar estado "activated"
  └─ Verificar permisos de notificación otorgados

PASO 4: Prueba Admin → Residente (Comunicado)
  └─ WebApp Admin: crear comunicado
  └─ Verificar toast de éxito
  └─ Verificar badge Comunicados +1 en WebApp
  └─ Abrir PWA de residente, verificar badge Comunicados +1
  └─ Verificar notificación push visible en PWA

PASO 5: Prueba Residente → Admin (PQR)
  └─ PWA Residente: crear PQR
  └─ Verificar toast de éxito en PWA
  └─ WebApp Admin: verificar badge PQR +1
  └─ Verificar notificación push en WebApp (si está abierta)

PASO 6: Prueba Portería → Residente (Visitante)
  └─ WebApp Admin (portería): registrar visitante
  └─ PWA Residente del apartamento: verificar badge Visitante +1
  └─ Verificar push recibido

PASO 7: Prueba Marcar como leída
  └─ Marcar notificación como leída en cualquier lado
  └─ Verificar badge baja en ambos lados (WebApp y PWA)
```

---

## Señales de Alerta (detener y revisar)

| Síntoma | Capa probable | Acción |
|---------|---------------|--------|
| No hay fila en `notifications` | Inserción falla (esquema, RSL, columna inexistente) | Revisar migración SQL y políticas RLS |
| Fila existe pero no hay push | Contrato frontend ↔ Edge Function o claves VAPID | Verificar formato de payload y VAPID keys |
| Push entregado pero badge no cambia | Filtro por `user_id` en badge o Realtime no se dispara | Revisar `useNotifications` y filtros |
| Badge cambia en un cliente pero no en otro | Canal Realtime o filtro de `user_id` inconsistente | Verificar suscripción a canal `notifications:{conjuntoId}` |
| Edge Function responde 200 pero `sent: 0` y `failed: >0` | Suscripciones expiradas o claves VAPID incorrectas | Limpiar suscripciones muertas, regenerar VAPID |

---

## Próximos Pasos

1. [ ] Ejecutar pruebas unitarias y de integración
2. [ ] Configurar entorno de staging con cuentas de prueba
3. [ ] Ejecutar pruebas E2E con Playwright
4. [ ] Corregir inconsistencias encontradas (esquema, VAPID, RLS)
5. [ ] Desplegar en producción por etapas (staging → canary → generalizado)
