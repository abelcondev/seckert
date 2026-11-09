# Pull requests

## Cuerpo del PR

Los títulos de sección van siempre en inglés; el contenido, en el idioma del change y de la conversación. El PR que abre seckert lleva `## Why`, `## What`, `## Testing`, el enlace al artifact de `design:` si existe, el `## Diagram` del change si tiene uno, y:
- `## Risk`: tareas sensibles (dinero, permisos, datos) y archivos delicados del diff (migraciones, auth, pagos, `.github/workflows`, despliegue), como "Revisá con cuidado: …". Si no hay nada sensible lo dice.
- `## How to revert`: corto y sin comandos destructivos. Revertir el merge; con migración, si el código anterior funciona con el schema nuevo y qué datos se perderían al deshacerla (deshacerla es una migración aparte, decidida en equipo); con flag, cuál apagar.
- `## Evidence`: la tabla de la última verificación y los tests `PREEXISTENTE`. Si nunca se verificó, lo dice.

## Borrador del PR

El cuerpo lo arma la herramienta `pr_draft` desde el change y el diff contra la base: base según el flujo (`develop` en gitflow, `main` en solo PRs y para `hotfix/*`), título Conventional Commits, Why, What, Diagram (si el change lo tiene), Testing, Risk y Evidence. Claude solo escribe `## How to revert`, que llega vacío. Si el change tiene `issue: #n`, el cuerpo empieza con `Fixes #n`: GitHub muestra el issue `in-review` y el merge lo cierra. Un FIX o SPEC tomado de un issue no tiene change: `pr_draft` con `issue` arma el PR desde el issue, sobre la rama actual. El Why lleva Problem, la cita y Outcome; el What, los criterios, y Decisions y Out of scope si los hay.

## Release

`release_draft` propone la versión desde el último tag (feat sube minor, solo fix sube patch, breaking sube major), la rama `release/x.y.z` y desde dónde sale, los archivos de versión del proyecto y las notas Features / Fixes desde `git log`. Los changes de la release son los issues con label `seckert:change` cerrados como completados desde la fecha de ese tag. Claude reescribe las notas en lenguaje de usuario.
