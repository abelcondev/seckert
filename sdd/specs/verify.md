# Verificación

## Registro en el Log

Cada verificación de un change deja una línea `- <fecha> verify: …`, escrita por `verify_record` con formato fijo: `VEREDICTO "<punto>" (evidencia)` por punto, separados por `;`, los tests `PREEXISTENTE` y los comandos corridos. Cada punto se nombra igual que en el What (lo visual contra el diseño, como `Diseño`); un punto que no está en el What se rechaza.

## Tope de rondas

Si un mismo punto del What falla por tercera vez, no se reabren sus tareas: queda en `## Open questions`, con el número siguiente y una propuesta de cambio de enfoque. Antes del tercer fallo, las tareas afectadas se reabren. Las rondas se cuentan en código, también las líneas viejas escritas como `verify (2ª ronda):`.

## Re-verificación

Desde la segunda ronda, el verificador comprueba solo los puntos que fallaron en la anterior, más la suite completa.

## Tipo de fallo

Cuando algo falla, el verificador nombra el tipo de error y todos los lugares del código donde aparece.

## Fallos preexistentes

Un test que falla en la rama y también en la base (`git merge-base` con `develop`/`dev` o `main`) es `PREEXISTENTE`: no reabre tareas y va al PR. Lo comprueba la herramienta `tests_on_base` en un worktree temporal fuera del proyecto, con el `node_modules` del proyecto enlazado, y lo borra siempre. Si el change tocó un `package.json` o un lockfile, si el test no existe en la base, si pasa ahí o si no se pudo correr, el veredicto es `FALLA`.
