# PAIC — Fase 5: Plan de Validación y Despliegue por Etapas

Objetivo: validar el sistema unificado de notificaciones (tabla central `notifications`, badges por usuario, canal Web Push) sin romper flujos existentes. Ningún cambio afecta a producción hasta pasar esta matriz.

## Requisitos previos (no tocar producción)

1. Entorno de prueba (Supabase staging o proyecto aislado) con claves VAPID configuradas en secretos del servidor (nunca en VITE_* ni en el navegador).
2. Cuentas de prueba existentes: al menos 1 administrador y 2 residentes de un conjunto de prueba.
3. Suscripciones push válidas registradas en `pwa_push_subscriptions` para al menos un dispositivo.
4. Migración `202610150001_add_referencia_to_notifications.sql` aplicada (columnas `referencia_recurso`, `tipo_recurso` presentes en `notifications`).
5. Políticas RLS activas en `notifications`: cada usuario lee solo sus filas (`user_id = auth.uid()` o `user_id IS NULL` para masivas de su conjunto).

## Cuatro pilares de verificación (por cada prueba)

Para cada caso de la matriz, comprobar por separado:

| Pilar | Qué verificar |
|-------|---------------|
| **Fila creada** | Existe registro en `notifications` con `conjunto_id`, `tipo`, `referencia_recurso`, `user_id` correcto |
| **Destinatario correcto** | `user_id` apunta al usuario esperado (o `NULL` para masivas de conjunto) |
| **Push entregado** | Edge Function `send-pwa-push` responde con `sent` > 0 y detalle de fallos; dispositivo recibe notificación |
| **Badge actualizado** | Contador del módulo correspondiente sube al crear y baja al marcar como leída, tanto en PWA residente como WebApp admin |

## Matriz de aceptación

| # | Acción | Actor | PWA residente | WebApp admin | Portería | Esperado (4 pilares) |
|---|--------|-------|---------------|--------------|----------|----------------------|
| 1 | Publicar comunicado | Admin | Push + badge Comunicados | Registro del evento + badge Comunicados | N/A | Fila `tipo=comunicado`, `user_id=NULL`; push a suscripciones del conjunto; badge Comunicados +1 |
| 2 | Crear PQR | Residente | Confirmación de envío | Push o aviso + badge PQR | N/A | Fila `tipo=pqr`, `user_id=NULL` (admin del conjunto); push; badge PQR del admin +1 |
| 3 | Responder PQR | Admin | Push al residente + badge PQR baja | Registro de respuesta | N/A | Fila `tipo=pqr`, `user_id=<residente>`; push solo a ese residente; badge PQR del residente +1 |
| 4 | Crear reserva | Residente | Confirmación de envío | Push o aviso + badge Reservas | Según flujo | Fila `tipo=reserva`, `user_id=NULL`; push; badge Reservas admin +1 |
| 5 | Aprobar/rechazar reserva | Admin | Push al residente + badge Reservas baja | Registro del cambio | N/A | Fila `tipo=reserva`, `user_id=<residente>`; push solo a ese residente |
| 6 | Publicar documento | Admin | Push + badge Documentos | Registro del evento | N/A | Fila `tipo=documento`, `user_id=NULL`; push; badge Documentos +1 |
| 7 | Publicar votación | Admin | Push + badge Votaciones | Registro del evento | N/A | Fila `tipo=votacion`, `user_id=NULL`; push; badge Votaciones +1 |
| 8 | Registrar visitante/paquete | Vigilante | Push al apartamento correcto | Aviso si corresponde | Confirmación de registro | Fila `tipo=porteria`, `user_id=NULL` o del apartamento; push; badge correspondiente |
| 9 | Aprobar/rechazar ingreso | Residente | Estado actualizado | Aviso si corresponde | Push o aviso del cambio | Fila `tipo=porteria`, `user_id=NULL`; push a portería/admin; badge +1 |
| 10 | Marcar notificación como leída | Cualquiera | Baja el contador correspondiente | Baja el contador correspondiente | Según destinatario | `leido=true`; contador del módulo -1 en todos los clientes conectados |
| 11 | Notificación masiva vs. específica | Admin | Solo ve lo que le corresponde | Solo ve lo que le corresponde | Solo ve lo que le corresponde | `user_id=NULL` solo para comunicados/documentos/votaciones; `user_id=<uid>` para respuestas PQR/reserva/visita |

## Pruebas de regresión (flujos existentes)

- **Portería y paquetes:** verificar que `visitor_logs`, `package_logs`, `pwa_visit_authorizations` siguen funcionando sin duplicar notificaciones.
- **PWA residentes:** `createPqr`, `createReservation`, `createVisitAuthorization`, `updateVisitorLogStatus` siguen retornando datos correctamente y el push existente no se rompe.
- **WebApp admin:** `notifyPwaResidents` para comunicados/documentos/votaciones sigue funcionando (masivo por diseño).
- **Badges:** `ModuleBadge`, `ModuleBadgeEnhanced`, `useModuleBadge` siguen renderizando cuando no se pasa `userId` (compatibilidad retrocesiva).

## Despliegue por etapas

1. **Staging:** ejecutar la matriz completa con cuentas de prueba.
2. **Canary:** desplegar en un conjunto de producción real pequeño (ej. 1 conjunto), monitorear logs de Supabase y errores del navegador durante 24-48h.
3. **Generalizado:** extender a todos los conjuntos solo si no hay errores en la canary.

## Señales de alerta (detener despliegue)

- Edge Function `send-pwa-push` responde HTTP 200 pero `sent: 0` y `failed: >0`.
- Fila en `notifications` creada con `user_id` incorrecto (mezcla de residentes).
- Badge sube pero no baja al marcar como leída.
- Error RLS: usuario ve notificaciones de otro residente del mismo conjunto.

## Cómo detectar en qué capa falla

| Síntoma | Capa probable |
|---------|---------------|
| No hay fila en `notifications` | Inserción falla (esquema, RLS, columna inexistente) |
| Fila existe pero no hay push | Contrato frontend ↔ Edge Function o claves VAPID |
| Push entregado pero badge no cambia | Filtro por `user_id` en badge o Realtime no se dispara |
| Badge cambia en un cliente pero no en otro | Canal Realtime o filtro de `user_id` inconsistente |
