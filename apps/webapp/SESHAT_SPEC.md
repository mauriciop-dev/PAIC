# Especificación Técnica — PAIC Seshat

**Versión:** 1.0 (borrador)
**Fuente:** `PAIC-Seshat.txt`
**Estado:** propuesta lista para implementación en fases

---

## 1. Resumen ejecutivo

Seshat es la plataforma maestra de administración de PAIC, accesible únicamente en el subdominio `seshat.paicai.com.co` para el correo `hmauricio.pineda@gmail.com`. Centraliza: KPIs de negocio (Panel), gestión de marketing (Marketing), mesa de ayuda interna (Técnico) y dos agentes de IA que monitorean y automatizan (Agentes).

Se implementa **en el mismo repositorio y la misma aplicación** que PAIC (React 19 + Vite + Supabase + Vercel), bajo la ruta `/seshat`, con un *gate* de acceso. Reutiliza la infraestructura existente: auth de Google, `supabase/functions/send-email` (Resend), Mercado Pago, GA4 y la API de Gemini.

---

## 2. Stack actual (referencia)

| Componente | Detalle |
|---|---|
| Frontend | React 19 + TypeScript + Vite, Tailwind vía CDN (`index.html`) |
| Backend | Supabase (Postgres, Auth, Storage, Edge Functions en Deno) |
| Correo | Resend (`supabase/functions/send-email/index.ts`; secrets `RESEND_API_KEY`, `SENDER_EMAIL`) |
| Pagos | Mercado Pago (`create-mp-preference`, planes en `services/plans.ts`) |
| Analítica | GA4 (`G-XHW9CWKTYY`, `services/analytics.ts`) |
| IA | Gemini vía `@google/genai` (`services/geminiService.ts`) |
| Deploy | Vercel (carpeta `.vercel`) |
| Dominios | `paicai.com.co`, `app.paicai.com.co`, nuevo `seshat.paicai.com.co` |

Schema existente relevante (`supabase/schema.sql`): `conjuntos`, `user_profiles` (rol `trial|subscriber|internal|admin`, `trial_expires_at`), `residents`, `account_status`, `providers`, `internal_staff`, `users`, `user_roles`, `common_areas`, `reservations`, `due_dates`, `tasks`, `expenses`, `incomes`, `access_points`, `visitor_logs`, `package_logs`, `chatbot_interactions`, `chat_messages`.

Ya existe `SuperAdminDashboard.tsx` con KPIs parciales (total conjuntos, residentes, suscripciones, MRR, nuevos del mes) que sirve como punto de partida para el Módulo Panel.

---

## 3. Arquitectura general

```
                    ┌─────────────────────────────────────────┐
                    │  Vercel  (misma app, mismas rutas)      │
                    │                                         │
  paicai.com.co ───▶│  /seshat ──▶ SeshatGate ──▶ SeshatApp    │
  app.paicai.com.co│     │  (email allowlist + noindex)      │
                    │     ▼                                   │
                    │  SeshatApp                             │
                    │  ├ Panel     (KPIs agregados)          │
                    │  ├ Marketing (emails, UTM, posts)      │
                    │  ├ Técnico   (issues, notif, PQR)      │
                    │  └ Agentes   (Tundama, Tequendama)     │
                    └──────────┬──────────────────────────────┘
                               │
                    ┌──────────▼──────────────────────────────┐
                    │  Supabase                              │
                    │  ├ Postgres (nuevas tablas §5)         │
                    │  ├ Auth (Google)                       │
                    │  ├ Storage (CSV, imágenes marketing)   │
                    │  └ Edge Functions (§10)                │
                    └───┬────────────┬──────────────┬─────────┘
                        │            │              │
                  ┌─────▼───┐  ┌─────▼─────┐  ┌─────▼─────┐
                  │ Resend  │  │ Mercado   │  │ Gemini    │
                  │ (email) │  │ Pago      │  │ (agentes) │
                  └─────────┘  └───────────┘  └───────────┘
```

---

## 4. Acceso, dominios y seguridad

### 4.1 Subdominio `seshat.paicai.com.co`
- Apuntar el subdominio al proyecto de Vercel (Vercel → Domain, `seshat.paicai.com.co`).
- En la app, la ruta `/seshat` se resuelve como ruta cliente (SPA). Al mismo dominio llegan `/` (landing) y `/seshat`.

### 4.2 No-index (obligatorio, doble capa)
1. `index.html`: agregar `<meta name="robots" content="noindex, nofollow">` **solo cuando** la ruta activa sea `/seshat` (SEO dinámico por ruta).
2. `vercel.json`: header `X-Robots-Tag: noindex` para la ruta `/seshat/**`:
   ```json
   {
     "headers": [
       { "source": "/seshat(.*)", "headers": [
         { "key": "X-Robots-Tag", "value": "noindex, nofollow" }
       ]}
     ]
   }
   ```
3. `public/robots.txt`: `Disallow: /seshat`.

### 4.3 Autenticación y autorización
- Entrada con el mismo login de Google de PAIC.
- **Gate en dos capas**:
  - Cliente: componente `SeshatGate` que verifica `userProfiles.email` contra allowlist.
  - Servidor: **toda** edge function de Seshat valida el JWT y el email contra el secreto `SESHAT_ALLOWED_EMAILS` antes de actuar. Nunca confiar solo en el gate del cliente.
- Configurable: `SESHAT_ALLOWED_EMAILS=hmauricio.pineda@gmail.com` (lista separada por comas).

### 4.4 Seguridad de datos
- Seshat lee datos multi-tenant agregados. **Nunca usar credenciales de cliente (anon key) para agregados**: usar service-role solo dentro de edge functions (`Authorization: Bearer <service_role>`).
- Las tablas nuevas de Seshat (issue, pqrs, etc.) con RLS **sin** políticas para clientes; solo service-role.
- Tabla `audit_logs` para registrar cada acción de Seshat y de los agentes (quién, qué, cuándo).

---

## 5. Modelo de datos (tablas nuevas)

### 5.1 Cambios sobre tablas existentes
- `user_profiles`: agregar columnas `utm_source text`, `utm_medium text`, `utm_campaign text` (first-touch; se llenan desde `analytics.trackUTM()`). Opcional: `trial_started_at timestamp`.
- `conjuntos.subscription_plan`: hoy es texto libre (`Free`/`Paid`); normalizar a valores de `services/plans.ts` (Edificio, Copropiedad, Megaproyecto, Corporativo, Free) mediante migración.

### 5.2 Tablas nuevas

**Suscripciones y pagos**
```sql
create table public.subscriptions (
  id bigint generated always as identity primary key,
  conjunto_id text not null references public.conjuntos(id),
  plan text not null,                      -- Edificio | Copropiedad | Megaproyecto | Corporativo
  billing_period text not null,            -- monthly | annual
  price numeric not null,
  status text not null default 'active',   -- active | trial | past_due | cancelled
  period_start date,
  period_end date,
  mp_external_reference text,
  created_at timestamptz default now()
);

create table public.payments (
  id bigint generated always as identity primary key,
  mp_payment_id text unique,
  conjunto_id text not null references public.conjuntos(id),
  amount numeric not null,
  status text not null,                    -- approved | pending | rejected
  external_reference text,
  received_at timestamptz default now()
);
```

**Eventos de uso (alimentan Panel, Ranking y WPA)**
```sql
create table public.usage_events (
  id bigint generated always as identity primary key,
  conjunto_id text,
  user_id uuid references auth.users(id),
  event text not null,                     -- page_view | section_view | feature_usage | chatbot_msg | demo_use | pwa_install | login
  module text,                             -- finanzas | seguridad | tareas | reservas | ...
  payload jsonb,
  created_at timestamptz default now()
);
create index idx_usage_events_conjunto on public.usage_events (conjunto_id, event, created_at);
```
> `analytics.ts` ya emite `page_view`, `section_view`, `feature_usage`, `login`, `sign_up`. Se instrumenta un `trackEvent()` que además persiste a `usage_events` (batch cada 5s o en `beforeunload`).

**Marketing / Emails**
```sql
create table public.email_templates (
  id bigint generated always as identity primary key,
  key text unique not null,                -- welcome_day1 | configure_day1 | videos_day5 | feedback_day13 | custom
  name text not null,
  subject text not null,
  html text not null,
  active boolean default true,
  updated_at timestamptz default now()
);

create table public.email_sends (
  id bigint generated always as identity primary key,
  template_key text,
  to_email text not null,
  subject text,
  status text default 'sent',              -- sent | opened | clicked | bounced | failed
  sent_at timestamptz default now(),
  opened_at timestamptz,
  resend_id text
);
create index idx_email_sends_to on public.email_sends (to_email, sent_at);

create table public.email_lists (
  id bigint generated always as identity primary key,
  name text not null,
  sheet_url text,
  csv_storage_path text,                   -- Storage: marketing/emails/<lista>.csv
  rows_imported integer,
  last_synced_at timestamptz
);

create table public.marketing_posts (
  id bigint generated always as identity primary key,
  network text not null,                   -- linkedin | facebook
  text text not null,
  image_storage_path text,
  utm_campaign text,
  status text default 'draft',             -- draft | scheduled | published | failed
  scheduled_at timestamptz,
  published_at timestamptz,
  created_at timestamptz default now()
);
```

**Técnico**
```sql
create table public.issues (
  id bigint generated always as identity primary key,
  title text not null,
  description text,
  severity text not null default 'P2',     -- P0..P3
  status text default 'nuevo',             -- nuevo | analisis | desarrollo | resuelto | verificado
  diagnosis text,
  suggested_fix text,
  source text,                             -- agente_tundama | manual | chatbot
  approved_at timestamptz,
  created_at timestamptz default now()
);

create table public.improvements (
  id bigint generated always as identity primary key,
  title text not null,
  rationale text,
  suggestion text,
  source text,
  status text default 'propuesto',
  created_at timestamptz default now()
);

create table public.pqrs (
  id bigint generated always as identity primary key,
  conjunto_id text references public.conjuntos(id),
  type text not null,                      -- peticion | queja | reclamo | sugerencia
  message text not null,
  priority text default 'normal',
  status text default 'abierta',
  response text,
  created_at timestamptz default now()
);

create table public.notifications_outbox (
  id bigint generated always as identity primary key,
  audience text not null,                  -- all | plan:<plan> | module:<modulo> | conjunto:<id>
  channel text not null,                   -- email | push | inapp
  title text,
  body text,
  status text default 'pending',
  sent_at timestamptz
);
```

**Agentes**
```sql
create table public.agent_logs (
  id bigint generated always as identity primary key,
  agent text not null,                     -- tundama | tequendama
  action text,
  tokens_used integer,
  summary text,
  created_at timestamptz default now()
);

create table public.agent_memory (
  id bigint generated always as identity primary key,
  agent text not null,
  memory_key text not null,
  content text,
  updated_at timestamptz default now(),
  unique (agent, memory_key)
);

create table public.agent_approvals (
  id bigint generated always as identity primary key,
  agent text not null,
  action text not null,                    -- enviar_email | publicar_post | aprobar_fix | crear_python
  payload jsonb,
  status text default 'pending',           -- pending | approved | rejected
  decided_at timestamptz
);
```

**Auditoría**
```sql
create table public.audit_logs (
  id bigint generated always as identity primary key,
  user_email text,
  action text not null,
  payload jsonb,
  created_at timestamptz default now()
);
```

---

## 6. Módulo Panel

UI: grid de tarjetas de KPI + gráficas (`recharts`, ya en `package.json`). Origen: **una edge function `seshat-panel`** que devuelve un payload agregado (evita N queries desde el cliente).

| Tarjeta | Fuente |
|---|---|
| Suscriptores por plan (incl. prueba 14 días y demo) | `conjuntos.subscription_plan` + `subscriptions` + `usage_events(event='demo_use')` |
| Ingresos por plan | `subscriptions` (MRR) y `payments` (cobrado real) |
| Vencimientos próximos | `user_profiles.trial_expires_at` y `subscriptions.period_end` en ventana 7 días |
| Seguridad (fallas, bugs, tiempo de respuesta) | `issues` agrupado por severidad/estado; promedio de días en `desarrollo→resuelto` |
| Ranking de conjuntos y módulos | `usage_events` agrupado por `conjunto_id` y `module` |
| WPA (descargas + secciones más usadas) | `usage_events(event='pwa_install')` y `section_view` por `module` |

Métricas de negocio recomendadas (adicionales al documento): **MRR/ARR, churn y el embudo demo → prueba → plan pagado** (conversión), DAU/MAU.

---

## 7. Módulo Marketing

### 7.1 Emails
- **Envío manual (Submódulo Emails):** vincular `email_lists` con un archivo de Google Sheets exportado como CSV (o subido a Storage). UI: seleccionar plantilla (`email_templates`), vista previa, y envío masivo personalizado.
- **Personalización:** la plantilla usa `{{conjunto}}`; se sustituye por cada fila.
- **Flujo de envío:** `send-email` (existente) o nueva edge function `marketing-send` que itera destinatarios con límite de tasa (p. ej. 1 por 200 ms) y registra en `email_sends`.
- **Unsubscribe:** cada correo incluye enlace `https://seshat.paicai.com.co/api/unsubscribe?e=<token>`; el handler desactiva la lista. *Requisito legal (CAN-SPAM) y de salud del dominio en Resend.*
- **Tracking:** activar webhooks de Resend (opened/clicked/bounced) → `seshat-webhook` que actualiza `email_sends`. Dashboard de métricas (tasa de apertura/rebote).

### 7.2 Campaña drip (prueba de 14 días)
El documento define: bienvenida (día 1), configurar PAIC (día 1), videos (día 5), feedback + elegir plan (día 13).

- **Motor:** edge function `drip-cron` invocada diariamente (programador de Supabase Edge Functions o `pg_cron`). Lógica:
  1. Seleccionar usuarios en `trial` con `trial_expires_at` dentro del rango correspondiente al día de la campaña.
  2. Resolver el template por día (función `drip_templates()`).
  3. Crear `email_sends` y despachar por Resend.
- Los templates se editan en el Submódulo Emails (tabla `email_templates`, claves `welcome_day1`, `configure_day1`, `videos_day5`, `feedback_day13`).
- **Mejoras recomendadas:** recordatorio "tu prueba vence en X días" (días 10–12) y correo post-vencimiento "tus datos están guardados, reactiva tu plan".

### 7.3 Estadísticas de redes (attribution)
- Todas las publicaciones generan links con **UTM**: `utm_source=linkedin|facebook`, `utm_medium=social`, `utm_campaign=<campaign>`, apuntando a `https://paicai.com.co/?<utm>` y `https://app.paicai.com.co/?<utm>`.
- `analytics.trackUTM()` ya lee `utm_source` (GA4). Se **persiste first-touch UTM** en `user_profiles` al registrarse.
- Panel de estadísticas: clics por publicación (GA4 / datos de `post_clicks`), conversiones a demo/prueba (join `user_profiles.utm_campaign` con `subscriptions` y `usage_events(event='demo_use')`).

### 7.4 Publicaciones (LinkedIn / Facebook)
- UI de borrador: texto + imagen generada por IA (Gemini `imagen`), campo `utm_campaign` autogenerado, programación.
- **Aprobación previa** en `agent_approvals` antes de publicar.
- Publicación vía APIs de LinkedIn/Facebook (o cola manual con enlace de publicación); estado en `marketing_posts`.

---

## 8. Módulo Técnico

- **Issues:** tabla `issues` con severidad P0–P3, workflow (nuevo → analisis → desarrollo → resuelto → verificado), botón "Aprobar solución" (registra en `audit_logs` y `approved_at`). Recomendado: sincronización 1:1 con Issues de GitHub (repo `mauriciop-dev/PAIC`) usando `gh`/API REST.
- **Notificaciones:** `notifications_outbox` con audiencia (todos / por plan / por módulo / conjunto específico), canal (email, push web PWA, in-app), programación. Notificación push: registrar SW push al `pwa_install`.
- **Mejoras:** tabla `improvements` (listado, diagnóstico, sugerencia de implementación), alimentada por los agentes.
- **PQRs:** tabla `pqrs` con prioridad, estado y respuesta; SLA de respuesta configurable.

---

## 9. Módulo Agentes

### 9.1 Rol de cada agente
- **Tundama (técnico):** lee logs de Supabase (edge functions, Postgres), errores de Vercel y de la app; genera entradas en `issues` con diagnóstico y fix sugerido; propone mejoras técnicas.
- **Tequendama (producto/marketing):** lee `usage_events`, `subscriptions`, `payments`; alimenta Panel, Ranking y módulos 1–3; redacta copy de marketing, genera imágenes y arma publicaciones; detecta oportunidades de mejora.

### 9.2 Arquitectura
- Edge function `agent-orchestrator`: recibe `{agent, task}`, arma el contexto desde la DB, llama a Gemini con *function calling* y ejecuta las herramientas permitidas.
- **Memoria compartida:** tabla `agent_memory` (coordinación sin repetir contexto); cada ejecución registra `agent_logs` (tokens, resumen).
- **Autorización:** acciones con efecto externo (enviar email, publicar, aprobar fix, ejecutar script) pasan por `agent_approvals`; el dueño las aprueba/rechaza desde la UI.
- **Presupuesto de tokens:** límite diario por agente en `seshat_config`; modelo ligero para monitoreo, modelo grande solo para generación.

### 9.3 Automatización Python (bajo aprobación)
- El documento prevé scripts Python aprobados por el dueño. Recomendación: si la tarea vive dentro de Supabase, usar Edge Functions (Deno) para evitar infraestructura extra; si es proceso pesado (ETL, imágenes), correr en un worker/contendor mínimo con cola. Decisión abierta (§15).

---

## 10. Edge Functions

| Función | Endpoint | Propósito |
|---|---|---|
| `send-email` | existente | Envío unitario vía Resend (reutilizar) |
| `create-mp-preference` | existente | Checkout Mercado Pago (revisar precio fijo `140000` vs `plans.ts`) |
| `seshat-gate` | `POST /seshat/gate` | Valida JWT + email allowlist (usado por todas) |
| `seshat-panel` | `GET /seshat/panel` | Payload agregado de KPIs del Panel |
| `seshat-webhook` | `POST /seshat/webhook/resend` | opened/clicked/bounced de Resend |
| `mp-webhook` | `POST /seshat/webhook/mp` | Notificaciones de pago → `payments`/`subscriptions` |
| `marketing-send` | `POST /seshat/marketing/send` | Envío masivo con plantilla + lista |
| `drip-cron` | schedule | Motor diario de la campaña de prueba |
| `unsubscribe` | `POST /seshat/unsubscribe` | Baja de campañas (token en `email_sends`) |
| `seshat-notify` | `POST /seshat/notify` | Despacha `notifications_outbox` |
| `agent-orchestrator` | `POST /seshat/agent` | Ejecución de Tundama/Tequendama |
| `agent-approve` | `POST /seshat/agent/approve` | Resuelve `agent_approvals` |

Convenciones: mismo patrón CORS y manejo de errores que `send-email/index.ts`.

---

## 11. Frontend

- Ruta: `/seshat` → `SeshatGate` → `SeshatApp`.
- Layout: sidebar de escritorio + bottom-nav móvil (reutilizar patrón `BottomNav`), **con la regla AGENTS.md de cero impacto en estilos globales**.
- Páginas/componentes:
  - `seshat/PanelView.tsx` — tarjetas KPI + gráficas recharts.
  - `seshat/MarketingView.tsx` — tabs: Publicaciones, Estadísticas, Emails.
  - `seshat/EmailsListView.tsx` — lista/CSV, plantillas, envío, métricas.
  - `seshat/TemplateEditor.tsx` — edición HTML de `email_templates` (preview).
  - `seshat/TecnicoView.tsx` — tabs: Issues, Mejoras, Notificaciones, PQRs.
  - `seshat/AgentsView.tsx` — log de agentes, cola de aprobaciones, presupuesto de tokens.
- Instrumentación: extender `services/analytics.ts` con `trackEvent()` que persista a `usage_events`.

---

## 12. Fases de implementación

**Fase 0 — Infraestructura**
Dominio `seshat.paicai.com.co`, `vercel.json` (noindex), `robots.txt`, `SeshatGate`, `seshat-gate`, allowlist, `audit_logs`.

**Fase 1 — Panel**
Migraciones (§5.2), instrumentación `usage_events`, `seshat-panel`, `PanelView`. Migrar/evolucionar `SuperAdminDashboard`.

**Fase 2 — Marketing**
`email_templates`, `email_lists`, `marketing-send`, `drip-cron`, `seshat-webhook` (Resend), UTM + first-touch, `marketing_posts` + aprobaciones, `EmailsView`.

**Fase 3 — Técnico**
`issues`, `improvements`, `pqrs`, `notifications_outbox`, `seshat-notify`, `TecnicoView`.

**Fase 4 — Agentes**
`agent-orchestrator`, `agent_logs`, `agent_memory`, `agent_approvals`, `AgentsView`, integración GitHub issues.

---

## 13. Secrets / variables de entorno (Supabase Edge Secrets)

- Existentes: `RESEND_API_KEY`, `SENDER_EMAIL`, `MERCADO_PAGO_ACCESS_TOKEN`.
- Nuevos: `SESHAT_ALLOWED_EMAILS`, `MERCADO_PAGO_WEBHOOK_SECRET`, `SHEETS_EXPORT_URL` (opcional), `GITHUB_TOKEN` (issues), tokens de LinkedIn/Facebook.
- Vercel: `VITE_*` actuales + ruta `/seshat` en SPA rewrites.

---

## 14. Riesgos y decisiones abiertas

1. **Misma app vs deploy separado:** se recomienda misma app/ruta con gate. Alternativa: proyecto Vercel separado solo para Seshat (más aislamiento, más coste/mantenimiento).
2. **Reemplazo del SuperAdmin existente:** decidir si `/seshat` sustituye a `SuperAdminDashboard` o conviven.
3. **Precio Mercado Pago:** `create-mp-preference` usa `PRICE_COP=140000` fijo, inconsistente con `services/plans.ts` (130k–380k). Alinear antes de medir ingresos reales.
4. **Infraestructura Python:** definir si se implementa en Deno/edge functions o en worker aparte (solo con aprobación del dueño).
5. **Push web:** requiere suscripción al service worker y permisos; fase opcional.
6. **Sincronización de Sheets:** el CSV en `Marketing/correos/DB_PAIC.csv` es exportación manual; la automatización total (pestaña live del Sheet) requiere `SHEETS_EXPORT_URL` público o API de Google Sheets.
