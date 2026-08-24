# Especificación Técnica, Arquitectura y Módulos: PWA de Residentes y Copropietarios (PAIC - `appcop`)

## 1. Visión General y Ubicación del Proyecto
Este documento define la arquitectura de software, especificación de interfaz, modelo de datos, roles y flujos funcionales para la **Progressive Web App (PWA)** orientada a la comunidad de copropietarios y residentes de **PAIC (Plataforma de Administración Inteligente de Conjuntos)**.

### Estructura de Repositorio y Carpetas Locales
* **Repositorio Central:** `https://github.com/mauriciop-dev/PAIC`
* **Directorio Raíz Local:** `C:\Users\micnu\OneDrive\PROYECTOS\PAIC`
* **Directorio Aplicación Residentes (PWA):** `C:\Users\micnu\OneDrive\PROYECTOS\PAIC\appcop`
* **Panel de Administración WebApp (Modulo PWA):** Incorpora una nueva sección "PWA" en la consola administrativa para gestionar y alimentar la información desplegada en la app de usuarios.

---

## 2. Flujos de Incorporación (Onboarding), Autenticación e Instalación

### 2.1 Autenticación Principal (Google Sign-In / OAuth2)
* La autenticación de la PWA se realiza exclusivamente mediante **Google Sign-In (OAuth2)**.
* No se gestionan contraseñas locales en el sistema.
* El `email` de Google actúa como el identificador primario para validar la membresía y los permisos contra la base de datos de PAIC.

### 2.2 Flujo A: Invitación Directa por Correo
1. El Administrador registra los datos de la unidad y el correo de Gmail del **Residente Principal** en el módulo de Base de Datos del panel de administración.
2. El sistema dispara automáticamente un correo electrónico de bienvenida con un enlace directo a la PWA.
3. Al ingresar, el usuario inicia sesión con su cuenta de Google.
4. La PWA reconoce el correo, asigna el rol correspondiente y despliega el banner nativo para **"Agregar a la pantalla de inicio"**.

### 2.3 Flujo B: Autorregistro por Código QR en Portería
1. Se dispone de un código QR físico en la portería o administración de la copropiedad.
2. El residente escanea el QR y abre la PWA en su navegador móvil.
3. Se autentica mediante Google Sign-In.
4. Si el correo no está registrado en la base de datos:
   * Se muestra un formulario para seleccionar **Copropiedad / Torre / Unidad (Apartamento u Oficina)**.
   * La solicitud queda en estado **`pendiente`**.
   * Se notifica al Administrador o al Residente Principal registrado para su aprobación.

---

## 3. Modelo de Roles, Permisos y Segmentación

| Rol | Definición | Alcance y Permisos | Aislamiento de Privacidad (Habeas Data) |
| :--- | :--- | :--- | :--- |
| **Residente Principal** | Encargado del grupo familiar o unidad (inquilino o propietario residente). | • Control completo de la unidad en la PWA.<br>• Invitar hasta 4 usuarios adicionales (vía Gmail).<br>• Acceso exclusivo al módulo de **Votaciones**.<br>• Radicación de PQRs, reservas y autorizaciones. | Acceso completo a las operaciones cotidianas de su hogar. |
| **Residente Secundario (Adicional)** | Convivientes, familiares o empleados autorizados por el Principal. | • Generación de autorizaciones e ingreso.<br>• Consulta de portería, comunicados y citofonía.<br>• *Restricción:* No visualiza la pestaña de gestión de Usuarios ni participa en Votaciones. | Operación cotidiana personal dentro del inmueble. |
| **Propietario No Residente** | Dueño del inmueble cuando este se encuentra arrendado o desocupado. | • Control patrimonial y paz y salvos.<br>• Consulta de estados de cuenta y comunicados oficiales.<br>• Citación a asambleas y delegación digital de poder. | **Bloqueo de Privacidad:** No puede ver registros de correspondencia, bitácora de portería, PQRs privadas ni reservas del inquilino. |

---

## 4. Especificación Detallada de Módulos (Panel Admin vs. PWA Usuarios)

La interfaz móvil de la PWA (`appcop`) se estructura sobre un diseño en **Acordeón y Tarjetas** para optimizar la navegación en pantalla táctil.

### 4.1 Comunicados
* **Panel Administrador (PAIC WebApp):**
  * Formulario para crear comunicados: *Título*, *Mensaje*, *Adjuntos (PDF o Imagen)* y botón *Enviar*.
  * Programación automática de envíos (ej. el día 30 de cada mes para adjuntar avisos de cobro y enlaces de pago).
* **PWA Residentes (`appcop`):**
  * Vista en tarjetas ordenadas cronológicamente.
  * Título en negrita, fecha y cuerpo del mensaje.
  * Vista previa inline si el adjunto es una imagen (ampliable a pantalla completa).
  * Botón de descarga/enlace directo si el adjunto es un archivo PDF.

### 4.2 Estado de Cuenta
* **Panel Administrador (PAIC WebApp):**
  * Tabla interactiva con filtro por unidad: *Apartamento*, *Estado (Al día, Pendiente, En Mora)*, *Saldo*, *Observaciones*.
  * Carga masiva de datos mediante plantilla o edición manual directamente en tabla.
  * Indicador de días transcurridos sin actualizar la información y fecha de última modificación.
* **PWA Residentes (`appcop`):**
  * Tarjeta ejecutiva con: **Apartamento (en negrita)**, Estado actual, Saldo pendiente, Observaciones y Fecha de última actualización.
  * *Nota aclaratoria visible:* "Esta es información de referencia. Si considera que no está actualizada, por favor comuníquese con la administración."

### 4.3 Portería (Correspondencia y Visitas)
* **Panel Administrador (PAIC WebApp):**
  * Tabla de control en tiempo real consolidando el estado por cada portería (ingreso de visitantes, domicilios y recepción de paquetes).
* **PWA Residentes (`appcop`):**
  * Tarjeta de notificación y estado en tiempo real mostrando los paquetes pendientes por retirar y las visitas o contratistas registrados para su apartamento.
  * *Nota aclaratoria visible:* "Información de referencia. Para validar detalles, acérquese a la portería respectiva."

### 4.4 Reservas de Áreas Comunes
* **Panel Administrador (PAIC WebApp):**
  * Tabla general de reservas: *Apartamento*, *Zona (BBQ, Salón Social, Gimnasio, etc.)*, *Fecha*, *Hora inicio*, *Hora fin*, *Estado (Pendiente, Aprobada)*.
  * Modal de calendario unificado que consolida las solicitudes creadas en la PWA y las registradas manualmente en la oficina.
  * **Regla del Negocio:** Las reservas en estado *Pendiente* tienen una vigencia máxima de **24 horas**. Si el residente no adjunta el comprobante de pago en ese lapso, el sistema libera automáticamente la agenda.
* **PWA Residentes (`appcop`):**
  * Formulario de solicitud: Selección de Zona, Fecha, Hora Inicio y Hora Fin.
  * **Adjunto Obligatorio:** Captura de pantalla, imagen o PDF del soporte de pago. El botón *Enviar* permanece inhabilitado hasta subir el soporte.
  * Tarjeta de estado en la parte inferior: "Estamos verificando la transacción. Una vez confirmada, el estado cambiará a Aprobada."

### 4.5 PQRs (Peticiones, Quejas, Reclamos y Felicitaciones)
* **Panel Administrador (PAIC WebApp):**
  * Tabla de PQRs con columnas: *Tipo*, *Apartamento*, *Nombre*, *Teléfono*, *Correo*, *Título*, *Descripción*, *Adjunto*, *Estado (Pendiente, Respondido)*, *Fecha de Recepción*, *Fecha de Respuesta* y *Contador de días transcurridos*.
  * Botón de respuesta que despliega modal con editor de respuesta y opción de adjuntar PDF oficial.
* **PWA Residentes (`appcop`):**
  * Formulario con selector desplegable (*Petición, Queja, Reclamo, Felicitación, Información, Otros*), datos de contacto, Título, Descripción y adjunto opcional.
  * Listado de PQRs radicas con su estado en tiempo real.
  * Al recibir respuesta, la tarjeta despliega: Estado actualizado, Título de respuesta, Cuerpo de la respuesta y enlace al documento adjunto de la administración.

### 4.6 Documentos e Institucional
* **Panel Administrador (PAIC WebApp):**
  * Repositorio de archivos compartidos: Formulario con *Nombre del documento*, *Descripción corta* y *Carga de PDF*.
* **PWA Residentes (`appcop`):**
  * Vista en acordeón clasificada. Al hacer clic en un documento, se despliega la descripción sintética y el botón para abrir/descargar el archivo PDF (reglamento de propiedad horizontal, actas de asamblea, estados financieros generales, etc.).

### 4.7 Votaciones y Encuestas (Exclusivo Usuario Principal)
* **Panel Administrador (PAIC WebApp):**
  * Creador de votaciones: Permite hasta 3 preguntas simultáneas con respuesta de selección múltiple (máximo 5 opciones por pregunta).
  * Tablero con gráficos de resultados por pregunta en tiempo real.
* **PWA Residentes (`appcop`):**
  * Módulo visible únicamente para cuentas autenticadas como **Residente Principal**.
  * Formulario interactivo que se activa cuando existe una consulta oficial emitida por la administración.

### 4.8 Directorio de Servicios y Emergencias
* **Panel Administrador (PAIC WebApp):**
  * Gestor de directorios clasificados por categorías (ej. *Emergencias*, *Comercio Local*, *Administración*, *Mantenimiento*).
  * Modales para agregar, editar o eliminar registros (*Categoría*, *Nombre/Entidad*, *Teléfono*).
* **PWA Residentes (`appcop`):**
  * Tarjetas informativas organizadas por categoría.
  * Integración con marcado nativo: Al hacer clic en el número telefónico, abre directamente la app de llamadas del dispositivo móvil (`tel:`).

### 4.9 Configuración y Gestión de Usuarios Adicionales
* **PWA Residentes (`appcop` - Solo Residente Principal):**
  * Formulario para invitar hasta **4 usuarios adicionales** (familiares o convivientes) ingresando únicamente sus correos de Gmail.
  * El sistema envía la invitación a cada correo con el enlace de acceso.
  * En caso de reconfiguración o cambio de equipo por parte de un familiar, el Residente Principal o la Administración pueden reenviar la invitación.
  * *Nota:* Esta pestaña está oculta para los usuarios con rol Adicional.

---

## 5. Arquitectura de Base de Datos y Rendimiento

### 5.1 Esquema Relacional Simplificado (Supabase / PostgreSQL)

```sql
-- Usuarios Autenticados vía Google OAuth2
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR UNIQUE NOT NULL,
    full_name VARCHAR,
    avatar_url VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mapeo de Membresías y Roles por Unidad
CREATE TABLE properties_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    copropiedad_id UUID NOT NULL,
    unidad_id UUID NOT NULL,
    rol VARCHAR CHECK (rol IN ('residente_principal', 'residente_secundario', 'propietario_no_residente')),
    estado VARCHAR CHECK (estado IN ('activo', 'pendiente', 'inactivo')) DEFAULT 'activo',
    invited_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reservas de Zonas Comunes
CREATE TABLE reservas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unidad_id UUID NOT NULL,
    user_id UUID REFERENCES users(id),
    zona VARCHAR NOT NULL,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    comprobante_url VARCHAR NOT NULL,
    estado VARCHAR CHECK (estado IN ('pendiente', 'aprobada', 'rechazada', 'expirada')) DEFAULT 'pendiente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);