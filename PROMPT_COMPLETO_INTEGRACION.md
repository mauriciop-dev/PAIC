# PROMPT COMPLETO PARA INTEGRAR NOTIFICACIONES EN PAIC

## OBJETIVO

Integrar el sistema de notificaciones completo en PAIC, incluyendo:
1. Llamadas a notifyPwaResidents en todos los submódulos del administrador
2. Badges visuales en las tarjetas de módulos (Comunicados, Reservas, PQR, Documentos, Votaciones, Directorio)
3. Notificaciones push en PWA del administrador y usuarios
4. Integración con el módulo Portería

## ARCHIVOS QUE NECESITAS AGREGAR O MODIFICAR

### 1. EJECUTAR EN SUPABASE (PRIMERO)
Ejecuta el archivo: `supabase-migrations-create-notifications-table.sql`

Abre tu proyecto en: https://supabase.com/dashboard/project/vgmwlzhlpehuvfkgqzja/sql/new

Copia todo el contenido de `supabase-migrations-create-notifications-table.sql` y pégalo en el editor SQL. Haz clic en "Run".

Esto creará:
- Tabla `notifications`
- Índices para búsquedas eficientes
- Políticas de RLS (Row Level Security) para leer/escribir notificaciones

### 2. ARCHIVO UTILIDAD EXISTENTE (o crear)
Si no tienes `apps/webapp/utils/notifications.ts`, créalo con el contenido de `notifications.ts`.

Si ya existe, agrégalos a ese archivo.

### 3. MODIFICAR CADA SUBMÓDULO DEL ADMIN

Busca y modifica estos archivos, agregando una llamada a `notifyPwaResidents` justo después de cada `await` de guardado:

#### A. COMUNICADOS
Busca el componente que crea comunicados (probablemente en `apps/webapp/components/...`). Después de insertar el comunicado en Supabase:

```typescript
// Ejemplo (ajustar según tu estructura real)
const { error } = await supabase.from('comunicados').insert({
  titulo: titulo,
  cuerpo: cuerpo,
  conjuntoId: conjuntoId,
});

if (error) throw error;

// AGREGAR ESTA LÍNEA DESPUÉS:
await notifyPwaResidents({
  conjuntoId,
  tipo: 'comunicado',
  titulo: titulo,
  cuerpo: cuerpo,
  userId: null, // envía a todos los residentes
});
```

#### B. RESERVAS
Busca la vista/componente de reservas (probablemente en `apps/webapp/components/views/BookingView.tsx` o similar):

```typescript
// Después de guardar la reserva
const { error } = await supabase.from('reservas').insert({
  titulo: titulo,
  descripcion: descripcion,
  fecha: fecha,
  conjuntoId: conjuntoId,
});

if (error) throw error;

await notifyPwaResidents({
  conjuntoId,
  tipo: 'reserva',
  titulo: `Nueva reserva: ${titulo}`,
  cuerpo: `Reserva creada para el ${formatDate(fecha)}`,
  userId: null,
});
```

#### C. PQR
Busca el componente de PQR (probablemente en `apps/webapp/components/views/PQRView.tsx`):

```typescript
// Después de guardar la PQR
const { error } = await supabase.from('pqrs').insert({
  titulo: titulo,
  descripcion: descripcion,
  tipo: tipo,
  conjuntoId: conjuntoId,
});

if (error) throw error;

await notifyPwaResidents({
  conjuntoId,
  tipo: 'pqr',
  titulo: `Nueva solicitud: ${titulo}`,
  cuerpo: tipo === 'queja' ? 'Nueva queja registrada' : 'Nueva sugerencia registrada',
  userId: null,
});
```

#### D. DOCUMENTOS
Busca el componente de documentos (probablemente en `apps/webapp/components/FileManagerModal.tsx`):

```typescript
// Después de subir el documento
const { error } = await supabase.from('documentos').insert({
  titulo: titulo,
  archivo_url: archivoUrl,
  conjuntoId: conjuntoId,
});

if (error) throw error;

await notifyPwaResidents({
  conjuntoId,
  tipo: 'documento',
  titulo: `Nuevo documento disponible: ${titulo}`,
  cuerpo: 'Verifica los documentos del conjunto',
  userId: null,
});
```

#### E. VOTACIONES
Busca el componente de votaciones:

```typescript
// Después de crear la votación
const { error } = await supabase.from('votaciones').insert({
  titulo: titulo,
  descripcion: descripcion,
  fecha: fecha,
  conjuntoId: conjuntoId,
});

if (error) throw error;

await notifyPwaResidents({
  conjuntoId,
  tipo: 'votacion',
  titulo: `Nueva votación: ${titulo}`,
  cuerpo: 'Participa en la votación',
  userId: null,
});
```

#### F. DIRECTORIO
Busca el componente del directorio (probablemente en `apps/webapp/components/views/DirectoryView.tsx`):

```typescript
// Después de crear un nuevo elemento en el directorio
const { error } = await supabase.from('directorios').insert({
  nombre: nombre,
  cedula: cedula,
  tipo: tipo,
  conjuntoId: conjuntoId,
});

if (error) throw error;

await notifyPwaResidents({
  conjuntoId,
  tipo: 'directorio',
  titulo: `Nuevo contacto en el directorio: ${nombre}`,
  cuerpo: 'Cédula: ' + cedula,
  userId: null,
});
```

### 4. AGREGAR BADGES A LOS MÓDULOS

En cada tarjeta de menú para los módulos, envuelve el título con el componente ModuleBadge.

#### Ejemplo en apps/webapp/components/views/DashboardView.tsx:

```typescript
import { ModuleBadge } from '../../components/ModuleBadge';

// En el menú de módulos
<div className="menu-item">
  <div className="flex items-center">
    <IconComunicados />
    <ModuleBadge tipo="comunicado" conjuntoId={conjuntoId} label="Comunicados" />
  </div>
</div>

<div className="menu-item">
  <div className="flex items-center">
    <IconReservas />
    <ModuleBadge tipo="reserva" conjuntoId={conjuntoId} label="Reservas" />
  </div>
</div>

// Repite para: pqr, documento, votacion, directorio
```

### 5. ACTIVAR SERVICE WORKER EN APP.TSX

En `apps/webapp/App.tsx`, agrega este código al inicio o cerca del `useEffect` de inicialización:

```typescript
// Importar usePWAServiceWorker
import usePWAServiceWorker from './usePWAServiceWorker';

function App() {
  const { serviceWorker, subscription } = usePWAServiceWorker();

  useEffect(() => {
    // Registro inicial de aplicaciones PWA
    if ('serviceWorker' in navigator) {
      // ya registrado en usePWAServiceWorker
    }
  }, []);

  // ... resto de tu App.tsx
}
```

### 6. INTEGRACIÓN CON PORTERÍA

#### A. En la vista de Portería/Kiosco

Busca el componente donde se registra un ingreso de visitante o paquete. Después de guardar, agrega:

```typescript
// Después de registrar el ingreso
const { error } = await supabase.from('porteria_ingresos').insert({
  cedula: cedula,
  tipo: tipo, // 'visitante' o 'paquete'
  motivo: motivo,
  conjuntoId: conjuntoId,
});

if (error) throw error;

await notifyPwaResidents({
  conjuntoId,
  tipo: 'porteria',
  titulo: `Nuevo ingreso: ${tipo === 'visitante' ? 'Visitante' : 'Paquete'}`,
  cuerpo: `Cédula: ${cedula} - ${motivo}`,
  userId: null,
});
```

#### B. Cuando cambia el estado del ingreso

```typescript
// Después de actualizar el estado
const { error } = await supabase
  .from('porteria_ingresos')
  .update({ estado: nuevoEstado })
  .eq('id', id);

if (error) throw error;

await notifyPwaResidents({
  conjuntoId,
  tipo: 'porteria',
  titulo: `Estado actualizado: ${nuevoEstado}`,
  cuerpo: 'El administrador ha actualizado el ingreso',
  userId: null,
});
```

#### C. Cuando el residente aprueba el ingreso

En la PWA del residente, cuando aprueba un ingreso, agrega:

```typescript
// En apps/webapp/usuarios/... (componente de aprobación)
const { error } = await supabase
  .from('porteria_ingresos')
  .update({ estado: 'aprobado' })
  .eq('id', ingresoId)
  .eq('residente_id', residenteId);

if (error) throw error;

// Notificar al administrador y portería
await notifyPwaResidents({
  conjuntoId,
  tipo: 'porteria',
  titulo: 'Visitante aprobado por residente',
  cuerpo: `El residente ha aprobado el ingreso del visitante con cédula ${cedula}`,
  userId: null, // admin y portería reciben
});
```

### 7. NOTIFICACIONES AL USUARIO CUANDO TIENE PQR/RESERVA

En la PWA del usuario, cuando envía una PQR o reserva, agrega:

```typescript
// Después de guardar la solicitud
const { error } = await supabase.from('pqrs').insert({
  titulo: titulo,
  descripcion: descripcion,
  tipo: tipo,
  conjuntoId: conjuntoId,
  user_id: currentUserId, // guardar referencia al usuario que crea
});

if (error) throw error;

// Notificar al administrador
await notifyPwaResidents({
  conjuntoId,
  tipo: 'pqr',
  titulo: `Nueva solicitud: ${titulo}`,
  cuerpo: tipo === 'queja' ? 'Nueva queja registrada' : 'Nueva sugerencia registrada',
  userId: null, // admin recibe
});
```

(Lo mismo aplica para reservas de usuario).

### 8. EJECUTAR Y TESTEAR

1. Ejecuta el SQL en Supabase
2. Despliega los cambios a Vercel
3. Abre la PWA del administrador en tu celular
4. Prueba cada escenario:
   - Crear comunicado → deberías recibir notificación en celular
   - Crear reserva → badge en tarjeta Reservas
   - Enviar PQR desde usuario → badge en admin
   - Registrar ingreso en portería → notificación en celular
   - Aprobar ingreso → notificación en admin y portería

### 9. AJUSTES FINALES

Si las notificaciones no llegan:
1. Verifica que `public/sw.js` esté accesible
2. Verifica que en el navegador móvil esté activado "Permitir notificaciones push"
3. Verifica que la clave pública de Push (en usePWAServiceWorker.ts) sea correcta para tu proyecto Google Cloud

## RESUMEN DE CAMBIOS

| Archivo | Acción |
|---------|--------|
| `supabase-migrations-create-notifications-table.sql` | Ejecutar en Supabase |
| `notifications.ts` | Crear o actualizar con utilidad |
| `ModuleBadge.tsx` | Crear con contenido provisto |
| `sw.js` | Crear en public/ |
| `usePWAServiceWorker.ts` | Crear para registrar service worker |
| Cada vista de módulo (comunicados, reservas, pqr, documentos, votaciones, directorio) | Agregar `await notifyPwaResidents()` |
| `App.tsx` | Integrar usePWAServiceWorker |
| Vistas de portería | Agregar llamadas notifyPwaResidents |

Sigue estos pasos exactamente para tener el sistema completo funcionando en 1-2 horas.