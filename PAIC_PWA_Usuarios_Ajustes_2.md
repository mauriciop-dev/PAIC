# Especificación Técnica y Directrices para la IA: Arquitectura de Accesos y Onboarding PWA en PAIC

## 1. Contexto del Proyecto y Objetivo
En la Plataforma de Administración Inteligente de Copropiedades (**PAIC**), se requiere desacoplar el acceso de administradores/personal interno del acceso para usuarios residentes/propietarios en la **PWA de Residentes** (`https://usuarios.paicai.com.co`).

Actualmente, el flujo de autenticación redirige a los usuarios residentes al login administrativo, lo cual genera confusión visual (pestañas de Personal Interno, botón de Demo) y riesgos de asignación errónea de roles en la base de datos. 

El objetivo principal es implementar un **flujo de acceso directo, limpio y pre-autorizado** para los residentes, gestionado mediante invitaciones por correo electrónico emitidas desde el panel administrativo.

---

## 2. Arquitectura de Accesos y Desacoplamiento de Rutas

### 2.1. Separación de Portales y Logins
1. **Portal Administrativo / Personal Interno:**
   * **Ruta:** `/admin/login` o portal principal.
   * **Audiencia:** Administradores, Contadores, Vigilantes/Portería.
   * **Componentes:** Pestañas de cambio de rol ("Soy Administrador" / "Soy Personal Interno"), botón "Probar Demo Gratis", OAuth con Google y Auth tradicional.

2. **Portal PWA de Residentes:**
   * **Dominio/Ruta:** `https://usuarios.paicai.com.co` (`/login` o `/app`).
   * **Audiencia:** Residentes, Propietarios y Arrendatarios.
   * **Diseño UX:** Interfaz minimalista y sin distracciones.
   * **Componentes:** Un único mensaje de bienvenida (*"Ingresa a tu conjunto"*), botón destacado **"Continuar con Google"** y/o Magic Link. **Queda estrictamente prohibido incluir elementos administrativos o demos en esta vista.**

---

## 3. Flujo de Invitación y Onboarding de Residentes

### 3.1. Gestión desde la Base de Datos (Módulo de Residentes)
En lugar de duplicar vistas o submódulos, la gestión del acceso PWA se integra en la tabla existente de **Base de Datos > Residentes**:

* **Nuevos Campos en Tabla / DB (Supabase):**
  * `pwa_status`: `enum('pending_invite', 'invited', 'active')` (Por defecto: `'pending_invite'`).
  * `pwa_invited_at`: `timestamp` (Fecha del último envío de correo vía Resend).
  * `user_id`: `uuid` (Llave foránea a `auth.users` vinculada tras el primer login exitoso).

* **Acciones en la Interfaz de Administración:**
  * **Columna "Estado PWA":** Muestra un badge visual (*Sin invitar*, *Invitación enviada*, *Activo*).
  * **Botón "Enviar Invitación":** Ubicado en la columna de acciones por cada residente con correo registrado. Al hacer clic, dispara la Edge Function de envío por correo a través de **Resend**.

### 3.2. Estructura del Correo de Invitación (Resend)
* **Asunto:** Invitación a la PWA de [Nombre del Conjunto] - PAIC
* **Contenido:**
  * Bienvenida personalizada con el nombre del residente y número de apartamento.
  * Botón CTA destacado: `https://usuarios.paicai.com.co/?conjunto={id_conjunto}&email={correo_residente}`
  * Instrucciones breves para instalar la PWA ("Agregar a la pantalla de inicio").

### 3.3. Experiencia del Residente al Abrir el Enlace
1. Al tocar el enlace, la PWA lee los parámetros `conjunto` y `email` en la URL.
2. La vista muestra: *"Hola [Nombre], confirma tu ingreso a [Nombre del Conjunto]"*.
3. El residente hace clic en **"Continuar con Google"**.
4. El backend valida que el correo coincida con el registrado en la tabla de residentes para ese conjunto:
   * **Si coincide:** Actualiza `pwa_status = 'active'`, asocia el `user_id` y le da acceso directo a la PWA sin requerir aprobación manual.
   * **Si no coincide:** Muestra un mensaje amigable indicando que debe solicitar acceso o registrarse con el correo registrado en la administración.

---

## 4. Submódulo "PWA residentes" (Gestión Masiva y Solicitudes)

El apartado **PWA residentes > Configuración** se mantiene con una doble función:

1. **Enlace / QR General:**
   * URL genérica (`https://usuarios.paicai.com.co/?registro=1&conjunto={id_conjunto}`) para carteleras o grupos de WhatsApp.
   * Los registros realizados por esta vía pasan a la sección de **"Solicitudes de acceso"** para aprobación manual del administrador.
2. **Control de Accesos:**
   * Muestra métricas rápidas (Total Residentes, Activos en PWA, Pendientes).
   * Filtro rápido para identificar residentes *"Sin acceso a PWA"* y disparar envíos masivos de invitaciones.

---

## 5. Instrucciones para la Implementación (Prompt para el Agente / IDE)

Al implementar esta funcionalidad en el proyecto (Google AI Studio / Cursor / Antigravity), sigue estas directrices:

1. **Frontend (React / Next.js / PWA):**
   * Separa la ruta `/login` de la PWA para que sea un componente exclusivo de residentes.
   * Lee y almacena los query params `conjunto` y `email` en el estado o `sessionStorage` para mantener el contexto durante el flujo OAuth.

2. **Backend / Database (Supabase & Edge Functions):**
   * Agrega las columnas `pwa_status`, `pwa_invited_at` y `user_id` a la tabla `residents`.
   * Crea un endpoint / Edge Function para enviar el correo de invitación usando **Resend** con el enlace parametrizado.
   * Configura la lógica RLS (Row Level Security) y triggers para asociar automáticamente el `auth.users.id` con la tabla `residents` cuando el correo electrónico autenticado coincida.
