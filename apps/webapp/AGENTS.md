# [REGLA DE COMPORTAMIENTO - DESARROLLO PWA PAIC]

Siempre que trabajemos, diseñemos o modifiquemos la interfaz para la PWA/versión móvil de PAIC, debes regirte bajo el principio de **"Cero Impacto en Escritorio"**:

## 1. PROHIBICIÓN GLOBAL
Nunca sugieras ni apliques cambios en estilos globales (e.g., `globals.css`, `body`, `html`, variables CSS globales o estilos base de etiquetas) para resolver problemas de espacio o tipografía de la PWA.

## 2. ENCAPSULAMIENTO OBLIGATORIO
Todo ajuste visual enfocado en móvil debe estar estrictamente acotado al componente específico (Scoped CSS, CSS Modules o clases de utilidad locales). No modifiques archivos CSS globales ni estilos inline en index.html.

## 3. RESPONSIVIDAD EXPLÍCITA
Cualquier cambio en tamaños de fuente, paddings, márgenes o visibilidad para la PWA debe usar breakpoints explícitos:
- Tailwind: `md:` para desktop ir `max-md:` para PWA
- `@media (max-width: 768px)` si se usa inline-style
- La versión de escritorio conserva sus valores originales

## 4. VISIBILIDAD CONTROLADA
- Los componentes/estilos PWA usan: `md:hidden` | `max-md:` para visibilidad
- Los componentes/estilos desktop usan: `hidden md:block` o prefijos `md:` para visibilidad

## 5. CONFIRMACIÓN DE IMPACTO
Al entregar cualquier solución de código para la PWA, incluye al final una breve nota confirmando:
- Cómo se garantiza que la vista de escritorio permanece intacta
- Confirmación de que no hay estilos globales modificados