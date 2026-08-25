# Referencia de Unificación — Monorepo PAIC

**Objetivo**: Unificar desarrollo, criterios y diseños de toda la plataforma PAIC bajo un único monorepo y repositorio central.

---

## Estructura del Monorepo

```
C:\Users\micnu\OneDrive\PROYECTOS\PAIC          ← Raíz del monorepo
│
├── apps/
│   ├── webapp/          ← WebApp administración (app.paicai.com.co)
│   ├── usuarios/        ← PWA Residentes/Copropietarios (usuarios.paicai.com.co) [en desarrollo]
│   │   └── docs/        ← Especificación técnica y documentos de diseño de la PWA
│   ├── marketing/       ← Página web de marketing (paicai.com.co)
│   └── docs/            ← Sitio de documentación (docs.paicai.com.co)
│
└── packages/
    ├── ui/              ← Componentes UI compartidos
    ├── types/           ← Tipos TypeScript compartidos
    ├── supabase/        ← Cliente Supabase compartido
    ├── config/          ← Configuración compartida
    └── analytics/       ← Analytics compartido
```

---

## Repositorios GitHub

| Componente | Repositorio |
|---|---|
| **Principal (monorepo)** | https://github.com/mauriciop-dev/PAIC |
| **Documentación** | https://github.com/mauriciop-dev/paic-docs |

> **Nota**: El repo `PAIC-Marketing` (legacy HTML) ya no está en uso activo. El desarrollo de marketing se hace dentro del monorepo en `apps/marketing/`.

---

## Tecnologías y Servicios

| Función | Tecnología |
|---|---|
| **Desarrollo** | Local con asistencia de IA |
| **Repositorio** | GitHub |
| **Despliegue** | Vercel |
| **Base de datos** | Supabase (PostgreSQL) |
| **Correos** | Rsend |
| **Gestor de paquetes** | pnpm (workspace monorepo) |

---

## Descripción de Cada App

| App | URL | Directorio | Estado |
|---|---|---|---|
| **WebApp administración** | https://app.paicai.com.co | `apps/webapp/` | ✅ Activa |
| **PWA Residentes** | https://usuarios.paicai.com.co | `apps/usuarios/` | 🔄 En desarrollo |
| **Página de marketing** | https://paicai.com.co | `apps/marketing/` | ✅ Activa |
| **Documentación** | https://docs.paicai.com.co | `apps/docs/` | ✅ Activa |

---

## Scripts del Monorepo (desde la raíz)

```bash
pnpm run dev:webapp       # Inicia WebApp administración
pnpm run dev:marketing    # Inicia página de marketing
pnpm run dev:usuarios     # Inicia PWA de residentes
pnpm run dev:docs         # Inicia sitio de documentación
pnpm run build:all        # Construye todas las apps
```

---

## Pendiente por resolver

- [ ] Definir si la PAIC_web legacy (HTML) se archiva o elimina
- [ ] Definir si WPA administrador móvil usa `apps/webapp/` o necesita `apps/admin/` dedicada
- [ ] Continuar desarrollo de `apps/usuarios/` (PWA de residentes)
