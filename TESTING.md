# Automated & Manual Testing Protocol (`TESTING.md`)

Este documento define la estrategia integral de pruebas para la plataforma, combinando validaciones a nivel de código, análisis de APIs, automatización de pruebas de interfaz mediante **Model Context Protocol (MCP)** (Chrome DevTools MCP / WebMCP) e instrucciones de entrega de reportes post-ejecución.

---

## 1. Resumen de la Estrategia de Pruebas

| Capa | Herramientas / Protocolo | Cobertura |
| :--- | :--- | :--- |
| **Pruebas de Código** | Jest / Vitest / PyTest / Playwright | Funciones unitarias, lógica de negocio y componentes de UI. |
| **Pruebas de API e Integración** | Postman / cURL / Supertest / OpenAPI | Contratos JSON, códigos de estado HTTP, autenticación y errores. |
| **Pruebas de Interfaz (MCP)** | Chrome DevTools MCP / WebMCP | Navegación real, interacción DOM, red, consola JS y accesibilidad. |
| **Reporte de Resultados** | Generación de `TEST_REPORT.md` | Matriz de hallazgos, métricas de paso/fallo y recomendaciones. |

---

## 2. Pruebas a Nivel de Código (Unit & Integration)

### 2.1 Ejecución de Tests
1. Asegúrate de tener instaladas las dependencias del proyecto (`npm install`, `pip install -r requirements.txt` o equivalente).
2. Ejecuta la suite de pruebas automatizadas:
   ```bash
   # Para entorno JavaScript / TypeScript / Node.js
   npm run test

   # Para proyectos Python
   pytest
   ```
3. Verifica la cobertura de código (mínimo objetivo recomendada: **80%** en componentes críticos):
   ```bash
   npm run test:coverage
   ```

### 2.2 Verificaciones Requeridas
- Validar casos límite (*edge cases*) en funciones utilitarias y procesadores de datos.
- Confirmar el aislamiento de componentes visuales mediante *mocks* o *stubs* para servicios externos.

---

## 3. Pruebas de API y Contratos de Datos

### 3.1 Puntos de Control
- **Respuesta de Estructura:** Confirmar que las respuestas sigan los esquemas esperados (TypeScript interfaces / JSON Schema).
- **Manejo de Errores HTTP:**
  - `400 Bad Request`: Payload con sintaxis o datos inválidos.
  - `401 Unauthorized / 403 Forbidden`: Tokens faltantes, expirados o permisos insuficientes.
  - `404 Not Found`: Recurso inexistente.
  - `500 Internal Server Error`: Asegurar que el backend retorne respuestas formateadas en JSON y no volcar trazas crudas.

### 3.2 Persistencia de Datos
- Comprobar que las operaciones **CRUD** afecten correctamente la base de datos subyacente y los estados compartidos antes y después de cada llamada.

---

## 4. Pruebas de Interfaz (UI/E2E) con Agentes MCP

Para la prueba de la interfaz real, el agente utilizará **Chrome DevTools MCP** o **WebMCP** para emular el comportamiento de un usuario humano interactuando con el DOM.

### 4.1 Entorno de Pruebas MCP
1. Levantar el servidor de desarrollo local (ej. `http://localhost:3000` o `http://localhost:5173`).
2. Inicializar la sesión del navegador configurando dos resoluciones:
   - **Desktop:** `1440 x 900 px`
   - **Mobile:** `375 x 812 px`

### 4.2 Flujos de Usuario Obligatorios (*User Journeys*)

#### Flujo 1: Carga Inicial y Consola
- Navegar a la página raíz (`/`).
- Escuchar eventos en la consola JavaScript y verificar **ausencia de errores fatales** (`Uncaught SyntaxError`, `TypeError`, `CORS blocked`).
- Inspeccionar peticiones fallidas en la pestaña de red (Network).

#### Flujo 2: Autenticación y Navegación
- Simular ingreso a la pantalla de login/registro.
- Ingresar credenciales de prueba válidas e inválidas.
- Validar redirección correcta, persistencia de sesión en cookies/localStorage y actualización de estado visual.

#### Flujo 3: Interacciones y Operaciones en Interfaz
- Probar la creación, lectura, edición y eliminación de datos desde la interfaz (formularios, modales, tablas).
- Validar componentes interactivos: menús desplegables, toggles, modales, botones de acción.
- Verificar estados de carga (*spinners*, *skeletons*) e indicadores visuales de éxito/error.

#### Flujo 4: Resiliencia Visual y Accesibilidad Básica
- Validar enlaces e imágenes rotas (`src` devolviendo `404`).
- Probar navegación por teclado (`Tab`, `Enter`, `Esc`).
- Validar superposición de elementos (*z-index*) y desbordamientos en pantalla móvil.

---

## 4.3 Flujos de Usuario Obligatorios (*User Journeys*) - Módulo de Comunicaciones

#### Flujo 5: Módulo de Comunicaciones con Enlaces de Google Drive
- Navegar al módulo de Comunicaciones desde el navbar o bottom nav.
- Verificar que el campo de adjuntar archivos haya sido reemplazado por un input para enlaces de Google Drive.
- Probar validación de enlaces de Drive:
  - Intentar enviar enlace vacío → debe mostrar error "Por favor ingrese un enlace"
  - Intentar enviar enlace no de Drive (ej: https://google.com) → debe mostrar error de formato inválido
  - Enviar enlace de archivo de Drive válido (https://drive.google.com/file/d/FILE_ID/view) → debe aceptarse y mostrarse en la lista
  - Enviar enlace de carpeta de Drive válido (https://drive.google.com/folders/FOLDER_ID) → debe aceptarse y mostrarse en la lista
- Verificar que cada enlace agregado muestra:
  - Icono de Google Drive
  - Nombre descriptivo ("Archivo de Drive" o "Carpeta de Drive")
  - El enlace completo
  - Botón de eliminación (ícono x) que funciona correctamente
- Verificar el banner informativo permanente sobre permisos de Drive:
  - "Asegúrate de que este archivo o carpeta en Google Drive tenga los permisos configurados como 'Cualquier persona con el enlace puede ver' para evitar problemas de acceso con los residentes."
- Probar el flujo completo de envío de comunicado:
  - Llenar asunto y cuerpo
  - Añadir destinatarios (individualmente o por grupos)
  - Añadir uno o más enlaces de Google Drive
  - Click en "Enviar"
  - Verificar mensaje de éxito y limpieza del formulario
- Probar eliminación de enlaces:
  - Añadir múltiples enlaces
  - Eliminar uno específico usando el botón de eliminación
  - Verificar que solo el enlace seleccionado se elimine
- Verificar que el estado se mantenga correctamente al abrir y cerrar el modal de enlaces múltiples veces

---

## 5. Instrucciones para la Generación del Informe (`TEST_REPORT.md`)

Al finalizar la ejecución completa de las pruebas, el agente o desarrollador **DEBE** compilar y guardar un archivo nombrado `TEST_REPORT.md` en la raíz del proyecto con la siguiente estructura:

```markdown
# Informe de Pruebas de Software (`TEST_REPORT.md`)

## 1. Resumen Ejecutivo
- **Fecha de Ejecución:** [AAAA-MM-DD HH:MM]
- **Entorno Probado:** [Localhost / Staging URL]
- **Resultado General:** [EXITOSO / CON ADVERTENCIAS / FALLIDO]
- **Métricas Globale:**
  - Total de Flujos Evaluados: X
  - Flujos Aprobados: Y
  - Flujos Fallidos: Z

---

## 2. Matriz de Hallazgos y Errores
| ID | Severidad (Alta/Media/Baja) | Capa (Código / API / UI-MCP) | Descripción del Problema | Pasos para Reproducir | Comportamiento Esperado | Comportamiento Observado |
|---|---|---|---|---|---|---|
| BUG-001 | Alta | UI-MCP | Error 500 al guardar formulario de perfil | 1. Ir a /profile <br> 2. Editar campo <br> 3. Clic Guardar | Guardar y mostrar notificación | La pantalla se congela y sale error 500 en Network |
| BUG-002 | Media | UI-MCP | Desbordamiento de texto en móvil | 1. Redimensionar a 375px <br> 2. Ver card principal | Texto contenido sin scroll horizontal | El texto se sale del margen derecho |

---

## 3. Registro de Consola y Red (MCP Captured Logs)
- **Errores de Consola JS:** [Lista de errores capturados durante la simulación de interfaz]
- **Fallos de Red (HTTP 4xx / 5xx):** [Lista de endpoints fallidos con sus payloads y códigos de respuesta]

---

## 4. Recomendaciones y Plan de Acción
1. **Acciones Inmediatas (Bloqueantes):** Correcciones críticas en backend o navegación.
2. **Mejoras de UX y Accesibilidad:** Ajustes visuales, diseño responsivo y estados vacíos/de carga.
3. **Optimización de Pruebas:** Nuevos casos de prueba sugeridos para la siguiente iteración.
```

---

## 6. Lista de Chequeo Final (Pre-Pull Request / Deployment)
- [ ] Pruebas unitarias ejecutadas y aprobadas.
- [ ] Endpoints verificados con respuestas válidas.
- [ ] Flujos visuales recorridos con agente MCP sin excepciones en consola.
- [ ] Archivo `TEST_REPORT.md` generado en la raíz del repositorio.
