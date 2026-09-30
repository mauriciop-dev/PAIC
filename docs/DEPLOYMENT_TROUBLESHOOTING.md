# PAIC: registro de despliegues

Este documento registra los problemas encontrados al desplegar PAIC en Vercel y las soluciones aplicadas.

## Arquitectura de despliegue

El repositorio es un monorepo con dos proyectos Vercel independientes que usan el mismo repositorio GitHub:

- WebApp administrativa: `apps/webapp`
- PWA de residentes: `apps/usuarios`

Ambos proyectos deben usar la rama `main`.

## Configuración final en Vercel

### WebApp administrativa

En el proyecto Vercel de la WebApp:

```text
Root Directory: .
Install Command: pnpm install
Build Command: pnpm --filter webapp build
Output Directory: apps/webapp/dist
Production Branch: main
```

Se usa la raíz del repositorio porque el proyecto depende de paquetes `workspace:*` y necesita leer `pnpm-workspace.yaml` y `pnpm-lock.yaml`.

### PWA de residentes

En el proyecto Vercel de Usuarios:

```text
Root Directory: apps/usuarios
Install Command: pnpm install
Build Command: pnpm build
Output Directory: dist
Production Branch: main
```

## Problemas y soluciones

### 1. `vite: command not found`

**Síntoma:**

```text
sh: line 1: vite: command not found
Error: Command "vite build" exited with 127
```

**Causa:** Vercel ejecutaba `vite build` directamente y Vite no estaba disponible en el entorno de producción del workspace raíz.

**Solución:**

- Añadir Vite a las dependencias de producción del `package.json` raíz.
- Mantener Vite como dependencia de producción de `apps/webapp`.
- Usar el comando del workspace:

```powershell
pnpm --filter webapp build
```

Commits relacionados:

- `c1abbf7 fix: include vite in webapp production dependencies`
- `7c1699f fix: make vite available to vercel builds`

### 2. `Could not resolve entry module "index.html"`

**Síntoma:**

```text
Could not resolve entry module "index.html"
```

**Causa:** Vercel ejecutaba Vite desde la raíz del repositorio, pero el `index.html` de la WebApp está dentro de `apps/webapp`.

**Solución:** usar la raíz del monorepo y apuntar el build y la salida al workspace correcto:

```text
Build Command: pnpm --filter webapp build
Output Directory: apps/webapp/dist
```

### 3. `npm error Unsupported URL Type "workspace:"`

**Síntoma:**

```text
npm error Unsupported URL Type "workspace:"
```

**Causa:** Vercel ejecutaba `npm install`, pero el monorepo usa dependencias internas con `workspace:*`, que requieren pnpm.

**Solución:** configurar:

```text
Install Command: pnpm install
```

### 4. `Command "build" not found`

**Síntoma:**

```text
sh: line 1: Build: command not found
```

**Causa:** se introdujo la etiqueta completa en el campo de Vercel, en vez de solo el valor. Vercel intentó ejecutar:

```text
Build Command: pnpm --filter webapp build
```

**Solución:** el campo debe contener únicamente:

```text
pnpm --filter webapp build
```

No se deben escribir las etiquetas `Build Command:` o `Output Directory:` dentro de los campos.

### 5. Root Directory incorrecto para Usuarios

**Síntoma:**

```text
The specified Root Directory "usuarios" does not exist
```

**Causa:** la carpeta no está en la raíz; está dentro de `apps`.

**Solución:**

```text
Root Directory: apps/usuarios
```

### 6. `Invalid apps/webapp/vercel.json file provided`

**Causa:** la configuración del proyecto se estaba mezclando entre el archivo `vercel.json` y los Project Settings de Vercel. El proyecto WebApp funciona mejor con la configuración del dashboard y sin un `vercel.json` anidado conflictivo.

**Solución:** se eliminó `apps/webapp/vercel.json` y se trasladó la configuración a Project Settings.

Commit relacionado:

- `9ab99a4 fix: remove invalid webapp vercel config`

## Checklist antes de redeployar

1. Confirmar que el commit desplegado pertenece a `main`.
2. Confirmar que el proyecto WebApp usa Root Directory `.`.
3. Confirmar que el proyecto Usuarios usa Root Directory `apps/usuarios`.
4. Confirmar que ambos proyectos usan `pnpm install`.
5. Confirmar que el build de WebApp es `pnpm --filter webapp build`.
6. Confirmar que el build de Usuarios es `pnpm build`.
7. Confirmar las carpetas de salida: `apps/webapp/dist` y `dist` respectivamente.
8. Si se cambia la configuración, hacer un redeploy sin cache.

## Validaciones locales

Desde la raíz del repositorio:

```powershell
pnpm --filter webapp lint
pnpm --filter webapp build
pnpm --filter usuarios build
```

No usar `supabase db reset` para validar despliegues de Vercel. Ese comando es para una base Supabase local y requiere Docker.
