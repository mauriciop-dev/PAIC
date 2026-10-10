# PAIC — Diagnóstico y Plan de Notificaciones + Badges

Fecha: 2026-10-09 | Autor: asistente IA
Estado: PARCIAL (tienes notificaciones de paquete/portería funcionando; faltan las demás)

---

## 1. DIAGNÓSTICO RÁPIDO (por qué solo te funciona a medias)

| Capa | Qué pasa | Por qué falla / está parcial |
|------|----------|------------------------------|
| **WebApp Admin** (app.paicai.com.co) | Tienes `notifyPwaResidents` en `PwaAdminView` y canales Realtime (`package-notifications`) | Solo se dispara en comunicados y paquetes; **no hay llamada equivalente** para reservas, PQR, documentos, votaciones, directorio |
| **PWA Usuarios** (usuarios.paicai.com.co) | Recibe las que sí llegan | No hay `service-worker` de push o falta suscripción por usuario (verifica `navigator.serviceWorker.register`) |
| **Badges / Badges en iconos** | Algunos módulos muestran números (Dashboard, Kiosk) | **No hay un componente unificado** de badge de módulo; cada vista cuenta por su cuenta |
| **Portería** (Porter / Kiosco) | Hay push a residente cuando cambia estado (KioskSecurityView) | Funciona para paquetes; **falta el push al administrador** cuando el residente aprueba ingreso |
| **DB / Realtime** | Supabase (`vgmwlzhlpehuvfkgqzja`) | Probablemente no tienes una tabla `notifications` central; usas canales de realtime aislados |

**Conclusión:** No necesitas "reinventar". Ya tienes el mecanismo (Supabase realtime + `notifyPwaResidents`). Lo que falta es **unificar los eventos** y **agregar las llamadas faltantes**. El badge es UI pura sobre la misma tabla de notificaciones.

---

## 2. ARQUITECTURA RECOMENDADA (manten simple)

No uses Web Push nativo complejo si ya tienes Supabase. Usa este flujo:

```
Evento en WebApp Admin  →  Inserta fila en tabla `notifications` (Supabase)
                              +  Publica en canal Realtime `notifications:{conjuntoId}`
                              +  Llama `notifyPwaResidents()` para push inmediato

PWA Usuarios  →  Suscrito a `notifications:{conjuntoId}` → recibe badge count + push
WebApp Admin  →  Suscrito a `notifications:{conjuntoId}` → recibe badge en módulo
Portería      →  Inserta fila `notifications` con tipo `porteria` → ambas reciben
```

**Tabla `notifications` sugerida (crea si no existe):**
```sql
create table notifications (
  id uuid primary key default gen_random_uuid(),
  conjunto_id uuid references conjuntos(id) not null,
  user_id uuid references users(id),          -- destinatario (residente o admin)
  tipo text not null,                          -- comunicado | reserva | pqr | documento | votacion | directorio | porteria | visitante
  titulo text,
  cuerpo text,
  leido boolean default false,
  creado_at timestamp default now()
);
-- Índice para badges rápidos
create index idx_notifications_conjunto_unread on notifications(conjunto_id, leido) where leido = false;
```

---

## 3. PLAN PASO A PASO (lo que tu asistente debe hacer)

### Fase A — Unificar la fuente de verdad (1 día)
1. Crear tabla `notifications` en Supabase (ver SQL arriba).
2. Crear función `notifyPwaResidents()` que inserte + publique realtime + retorne `{sent, total}`.
3. En cada submódulo del admin (comunicados, reservas, PQR, documentos, votaciones, directorio), agregar **una sola línea** al guardar: `await insertNotification({conjuntoId, tipo: 'reserva', titulo, ...})`.

### Fase B — Badges en WebApp (1 día)
4. Crear componente `ModuleBadge.tsx` que lea `notifications` por `tipo` + `leido = false`.
5. En cada tarjeta/icono del módulo WPA Residentes, envolver con `<ModuleBadge tipo="reserva">`.

### Fase C — PWA push (1 día)
6. Verificar que `usuarios.paicai.com.co` registre `service-worker.js` con `PushSubscription`.
7. Si falta: agregar `navigator.serviceWorker.register('/sw.js')` + `push` event listener en `sw.js`.

### Fase D — Portería (0.5 día)
8. En `KioskSecurityView` / portería: al registrar ingreso de visitante → `insertNotification({tipo:'porteria', titulo:'Ingreso', ...})`.
9. Al cambio de estado del visitante (aprobado/denegado) → mismo flujo.
10. Al usuario aprobar ingreso → `insertNotification({tipo:'porteria', titulo:'Aprobado', user_id: residente_id})` para que admin/portería vean el badge.

---

## 4. PROMPTS LISTOS PARA TU ASISTENTE IA (copiar y pegar)

Usa estos exactamente. Cada uno es un pedido independiente; no pidas todo junto.

### PROMPT 1 — Tabla + función central (haz primero)
```
En el proyecto PAIC (repo https://github.com/mauriciop-dev/PAIC, Supabase vgmwlzhlpehuvfkgqzja) crea la tabla notifications con los campos: id, conjunto_id, user_id, tipo, titulo, cuerpo, leido, creado_at. Luego crea la función notifyPwaResidents() que: (1) inserte en notifications, (2) publique en canal realtime notifications:{conjuntoId}, (3) retorne {sent, total}. Usa TypeScript y el cliente de Supabase existente en apps/webapp.
```

### PROMPT 2 — Integrar eventos del Admin (uno por módulo; haz 6 pequeños)
```
En apps/webapp, busca el componente que guarda un comunicado/reserva/PQR/documento/votación/entrada de directorio. Después de la inserción exitosa en Supabase, agrega una llamada a notifyPwaResidents({conjuntoId, tipo: 'reserva', titulo: 'Nueva reserva', cuerpo: '...', userId: null}) para que todos los residentes reciban la notificación. No modifiques la lógica de guardado existente, solo agrega la línea después del await.
```

### PROMPT 3 — Badge unificado (UI)
```
Crea un componente React ModuleBadge que reciba prop tipo y lea de Supabase la cantidad de notifications no leídas para ese tipo y conjunto_id. Luego úsalo en el menú/card de Comunicados, Reservas, PQR, Documentos, Votaciones y Directorio para que aparezca un círculo rojo con el número. No uses CSS complejo, usa Tailwind text-xs bg-red-600 rounded-full.
```

### PROMPT 4 — PWA push (si no llega al celular)
```
En apps/webapp o usuarios.paicai.com.co, verifica que haya un service-worker registrado. Si no existe, crea public/sw.js que escuche push y muestre notificación. En la app principal, agrega el registro de service worker cuando el usuario acepte notificaciones. Usa la API de Notificaciones nativa (Notification.requestPermission) como fallback si Push no funciona.
```

### PROMPT 5 — Portería notificaciones a residentes
```
En el módulo Portería / Kiosco (KioskSecurityView o componente equivalente), al registrar un ingreso de visitante o paquete, agrega insertNotification({tipo:'porteria', titulo:'Ingreso de visitante', cuerpo:'...', conjuntoId}). Al cambiar el estado (aprobado/denegado), agrega otra fila con el estado nuevo. Que el residente reciba push en su PWA.
```

### PROMPT 6 — Notificación al admin de portería (badge para admin)
```
En el mismo flujo de portería, cuando un residente aprueba el ingreso del visitante (botón de aprobación en la PWA del usuario), inserta una fila notifications con tipo 'porteria', user_id igual al admin/portero y cuerpo 'El residente aprobó la entrada'. Esto hará que aparezca el badge en WebApp Admin.
```

---

## 5. CHECKLIST RÁPIDA PARA TÚ (antes de pedir al asistente)

- [ ] ¿Ya tienes `service-worker.js` registrado en `usuarios.paicai.com.co`? (prueba en el celular con DevTools remoto)
- [ ] ¿Ya existe la tabla `notifications` en Supabase? (revisa el dashboard)
- [ ] ¿El componente `notifyPwaResidents` ya está en `PwaAdminView`? (sí, según tu grep)
- [ ] ¿Cada módulo guarda datos con `await supabase.from('...').insert()`? (necesitas agregar la línea de notificación justo después de cada `await`)

Si marcas los 4, los 6 prompts anteriores hacen el resto sin tocar arquitectura.

---

## 6. NOTA SOBRE SUBDOMINIO PARA PWA ADMIN

Dijiste que la PWA del admin está en `app.paicai.com.co`. Si quieres separarla, crea `app.paicai.com.co/pwa` o asigna `admin.paicai.com.co` (ya lo usas para el admin general). **No es requisito para las notificaciones**, pero si quieres, agrega el subdominio en Vercel + DNS antes de la Fase C.

---

¿Quieres que genere también los archivos físicos (`notifications.ts`, `ModuleBadge.tsx`, `sw.js`) para que solo copies y pegues? Dime si prefieres que te los escriba en el workspace o que sigas solo con los prompts.
