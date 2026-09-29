# PAIC Technical Wiki

Esta carpeta contiene la configuración y la documentación técnica generada para PAIC con RepoWiki.

La documentación funcional para usuarios continúa en `apps/docs`. Esta wiki se enfoca en la arquitectura del código, módulos, dependencias, símbolos y flujo de lectura recomendado.

## Generación local

Instala RepoWiki y configura una clave de un proveedor compatible con LiteLLM:

```powershell
pip install repowiki
$env:DEEPSEEK_API_KEY = "tu-clave"
repowiki scan . --site -o docs/technical-wiki/generated
```

El resultado queda en `docs/technical-wiki/generated`. La carpeta generada no debe editarse manualmente.

## Publicación

El workflow `RepoWiki Technical Documentation` genera la wiki al ejecutar manualmente el workflow o al cambiar el código principal en `main`. El sitio se publica en GitHub Pages.

Configura el secreto `DEEPSEEK_API_KEY` en el repositorio antes de ejecutar el workflow. También puedes sustituir el proveedor y el secreto en `.github/workflows/repowiki.yml`.

## Seguridad

RepoWiki analiza el código fuente con el proveedor LLM configurado. No incluyas secretos en el repositorio y revisa la salida generada antes de compartirla públicamente.