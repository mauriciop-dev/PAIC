# PAIC Admin - Deployment Guide

## Despliegue en Vercel: `admin.paicai.com.co`

### 1. Configuración del Proyecto en Vercel

1. **Crear nuevo proyecto** en Vercel Dashboard
2. **Importar repositorio**: `mauriciop-dev/PAIC`
3. **Root Directory**: `apps/admin`
4. **Framework Preset**: Vite
5. **Build Command**: `npm run build`
6. **Output Directory**: `dist`
7. **Install Command**: `npm install`

### 2. Variables de Entorno Requeridas

En Vercel Project Settings → Environment Variables:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Clave anónima de Supabase | `eyJhbGciOiJIUzI1NiIs...` |
| `VITE_POSTHOG_KEY` | Project API Key de PostHog | `phc_xxxxxxxxxxxxx` |
| `VITE_POSTHOG_HOST` | Host de PostHog (opcional) | `https://app.posthog.com` |

**Importante**: Marcar todas como "Production", "Preview" y "Development".

### 3. Dominio Personalizado

1. En Vercel Project Settings → Domains
2. Agregar: `admin.paicai.com.co`
3. Configurar DNS en proveedor:
   ```
   Type: CNAME
   Name: admin
   Value: cname.vercel-dns.com
   TTL: 3600
   ```
4. Vercel emitirá certificado SSL automáticamente

### 4. Configuración de Supabase (Pre-requisitos)

Ejecutar en Supabase SQL Editor:

```sql
-- 1. Tabla platform_admins + RLS (ya en migración)
\i supabase/migrations/20261001_platform_admins.sql

-- 2. Funciones RPC necesarias para métricas
CREATE OR REPLACE FUNCTION public.get_usuarios_activos_hoy()
RETURNS TABLE (count bigint) LANGUAGE sql STABLE AS $$
  SELECT count(DISTINCT user_id) FROM public.pwa_sesiones 
  WHERE created_at >= CURRENT_DATE;
$$;

CREATE OR REPLACE FUNCTION public.get_usuarios_activos_mes()
RETURNS TABLE (count bigint) LANGUAGE sql STABLE AS $$
  SELECT count(DISTINCT user_id) FROM public.pwa_sesiones 
  WHERE created_at >= CURRENT_DATE - interval '30 days';
$$;

CREATE OR REPLACE FUNCTION public.get_cohortes_trial_30dias()
RETURNS TABLE (
  mes text, nuevos bigint, activos_d7 bigint, activos_d30 bigint, convertidos bigint
) LANGUAGE sql STABLE AS $$
  SELECT 
    to_char(c.created_at, 'YYYY-MM') as mes,
    count(*) as nuevos,
    count(*) FILTER (WHERE EXISTS (
      SELECT 1 FROM public.pwa_sesiones s 
      WHERE s.conjunto_id = c.id 
      AND s.created_at BETWEEN c.created_at AND c.created_at + interval '7 days'
    )) as activos_d7,
    count(*) FILTER (WHERE EXISTS (
      SELECT 1 FROM public.pwa_sesiones s 
      WHERE s.conjunto_id = c.id 
      AND s.created_at BETWEEN c.created_at AND c.created_at + interval '30 days'
    )) as activos_d30,
    count(*) FILTER (WHERE c.plan = 'Pro') as convertidos
  FROM public.conjuntos c
  WHERE c.created_at >= CURRENT_DATE - interval '30 days'
  GROUP BY to_char(c.created_at, 'YYYY-MM')
  ORDER BY mes;
$$;

-- 3. Índices para performance de logs
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_timestamp ON public.logs_auditoria(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_source_level ON public.logs_auditoria(source, level);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_conjunto ON public.logs_auditoria(conjunto_id);
```

### 5. Configuración PostHog

1. Crear proyecto en PostHog: `PAIC Admin`
2. Obtener Project API Key
3. Configurar eventos personalizados (ver `src/services/posthog.ts`)
4. Habilitar "Session Recording" para debugging

### 6. Verificación Post-Deploy

- [ ] Login con superadmin funciona
- [ ] Dashboard carga métricas reales
- [ ] ConjuntosView paginación y filtros funcionan
- [ ] LogsView muestra badge "LIVE" y tiempo real
- [ ] AgentesView carga 4 agentes con informes mock
- [ ] ConfiguracionView modal peligro pide contraseña
- [ ] PostHog recibe eventos (verificar en Live View)

### 7. Comandos Útiles

```bash
# Desarrollo local
cd apps/admin && npm run dev

# Build de producción
cd apps/admin && npm run build

# Preview build local
cd apps/admin && npm run preview

# Deploy manual a Vercel
cd apps/admin && vercel --prod
```

### 8. Estructura de URLs

| Ruta | Descripción |
|------|-------------|
| `/` | Redirect a `/dashboard` |
| `/dashboard` | Dashboard principal con KPIs |
| `/agentes` | Agent Command Center |
| `/conjuntos` | Gestión de conjuntos (paginado) |
| `/usuarios` | Usuarios de plataforma |
| `/suscripciones` | MRR, ARR, vencimientos |
| `/logs` | Logs tiempo real + histórico |
| `/metricas` | Funnel, cohortes, adopción PWA |
| `/configuracion` | Settings + Zona Peligro |

### 9. Seguridad

- Solo usuarios en tabla `platform_admins` con `activo=true` pueden acceder
- RLS en Supabase protege todas las tablas
- Zona Peligro requiere re-autenticación con contraseña
- Headers de seguridad configurados en `vercel.json`
- CSP recomendado para producción (agregar en vercel.json si necesario)

### 10. Monitoreo

- **Vercel Analytics**: Habilitar en proyecto
- **PostHog**: Eventos custom + session recording
- **Supabase Logs**: Revisar Edge Functions y DB performance
- **Sentry** (opcional): Para error tracking en frontend