# PAIC

PAIC (Plataforma de Administración Inteligente de Copropiedades) es una plataforma para apoyar la administración y operación de conjuntos residenciales. Este repositorio contiene las aplicaciones web del producto, paquetes compartidos y migraciones de Supabase.

## Aplicaciones

| Aplicación | Directorio | Descripción | Puerto local |
| --- | --- | --- | --- |
| Plataforma administrativa | `apps/webapp` | Aplicación principal para la administración de la copropiedad, incluidos módulos operativos, financieros y de seguridad. | 3000 |
| Sitio de marketing | `apps/marketing` | Sitio público con información del producto y sus planes. | 3001 |
| App para residentes | `apps/usuarios` | Aplicación web instalable (PWA) para residentes. | 3002 |
| Centro de documentación | `apps/docs` | Interfaz web de documentación del producto. | 3003 |

Las aplicaciones comparten componentes y utilidades ubicados en `packages/`.

## Tecnologías

- React 19, TypeScript y Vite.
- pnpm workspaces para administrar el monorepo.
- Supabase para autenticación, base de datos y funciones del backend.
- Vitest y Testing Library para pruebas automatizadas en las aplicaciones que las tienen configuradas.

## Requisitos

- Node.js 22.x.
- pnpm 9.12.0.
- Acceso a un proyecto Supabase para ejecutar las aplicaciones que usan backend.

Instala pnpm si aún no está disponible:

```bash
npm install --global pnpm@9.12.0
```

## Instalación

Desde la raíz del repositorio:

```bash
pnpm install
```

## Configuración

Configura las variables necesarias en el entorno local de cada aplicación. No subas archivos `.env`, claves privadas ni credenciales al repositorio.

### Plataforma administrativa (`apps/webapp`)

```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
VITE_MERCADO_PAGO_PUBLIC_KEY=
VITE_GOOGLE_DRIVE_API_KEY=
VITE_GOOGLE_CLIENT_ID=
VITE_OPENAI_API_KEY=
```

Las variables de Gemini, Mercado Pago, Google Drive y OpenAI son para las integraciones que las utilizan; no todas son necesarias para iniciar la aplicación. Para las variables de Supabase, usa la URL del proyecto y su clave pública/anon correspondiente.

### App para residentes (`apps/usuarios`)

El repositorio incluye `apps/usuarios/.env.example` como referencia. Crea una copia local llamada `.env.local` y completa, como mínimo, la configuración de Supabase:

```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_VAPID_PUBLIC_KEY=
```

La clave pública VAPID se usa para notificaciones push. Configura `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT` como secretos del backend (por ejemplo, en Supabase); nunca los pongas en variables `VITE_*` ni en el código del navegador.

## Desarrollo local

Ejecuta cada comando desde la raíz del repositorio, en una terminal independiente por aplicación:

```bash
pnpm dev:webapp
pnpm dev:marketing
pnpm dev:usuarios
pnpm dev:docs
```

Vite muestra en la terminal la URL local de cada servidor. Los puertos predeterminados son 3000, 3001, 3002 y 3003, respectivamente.

## Compilación y verificación

```bash
# Compilar todas las aplicaciones y paquetes
pnpm build:all

# Compilar una aplicación
pnpm build:webapp
pnpm build:marketing
pnpm build:usuarios
pnpm build:docs

# Ejecutar pruebas disponibles
pnpm test

# Verificar tipos
pnpm types

# Ejecutar las verificaciones de lint configuradas
pnpm lint
```

También puedes ejecutar pruebas o verificaciones de una aplicación directamente:

```bash
pnpm --filter webapp test
pnpm --filter webapp lint
pnpm --filter usuarios test
pnpm --filter usuarios lint
```

## Supabase

La configuración local del proyecto está en `supabase/config.toml` y las migraciones versionadas están en `supabase/migrations/`. Para trabajar con Supabase local, instala Docker y la Supabase CLI y consulta la [documentación de desarrollo local de Supabase](https://supabase.com/docs/guides/cli/local-development).

Revisa las migraciones antes de aplicarlas a cualquier entorno compartido o de producción. La referencia del esquema y notas relacionadas están en:

- `docs/CURRENT_SCHEMA.md`
- `SCHEMA_REFERENCE.md`
- `docs/IMPLEMENTATION_PLAN.md`

## Estructura del repositorio

```text
apps/
  docs/       Centro de documentación
  marketing/  Sitio público
  usuarios/   PWA para residentes
  webapp/     Plataforma administrativa
packages/
  analytics/  Analítica compartida
  config/     Configuración compartida
  supabase/   Cliente e integración con Supabase
  types/      Tipos y definiciones compartidas
  ui/         Componentes de interfaz reutilizables
supabase/
  migrations/ Migraciones de base de datos
docs/         Documentación técnica y operativa
```

## Documentación adicional

- [Protocolo de pruebas](TESTING.md)
- [Referencia del esquema](SCHEMA_REFERENCE.md)
- [Documentación técnica](docs/)

## Seguridad

- No guardes secretos ni credenciales en el código fuente o en archivos versionados.
- Las claves `VITE_*` se incluyen en el cliente web al compilar: solo deben contener valores seguros para exposición pública, como una clave anon protegida mediante políticas RLS.
- Mantén las claves privadas y credenciales de servicio únicamente en el backend o en el gestor de secretos del entorno correspondiente.
