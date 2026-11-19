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

## Lint y typecheck

El verificador toma los comandos de lint y typecheck de `## Commands` en el `AGENTS.md` o `CLAUDE.md` del proyecto. seckert no instala ni impone un linter. Cada comando pasa por la herramienta `checks_on_base`. Esa herramienta lo corre en la rama y, si falla, también en la base, en un worktree temporal como el de `tests_on_base`. Compara las líneas de salida sin colores ni números, porque editar un archivo corre las líneas.

- `PASA`: sin errores en la rama.
- `PREEXISTENTE`: los mismos errores ya estaban en la base. No reabre tareas y va al PR.
- `FALLA`: hay líneas de error nuevas, pasa en la base, no se pudo correr o el change tocó un `package.json` o un lockfile. Reabre las tareas que trajeron los errores.
- `SIN DEFINIR`: el proyecto no define el comando. Se informa y no falla.

`verify_record` los escribe en la línea verify como `Chequeos: lint <VEREDICTO> (<comando>: <errores>); typecheck …`. `done` no abre el PR con un `FALLA` de lint o typecheck.

## Casos límite

Por cada punto del What, el verificador prueba primero el caso que describe el punto. Después prueba entre 3 y 5 casos límite en el mismo estado aislado, por ejemplo: entrada vacía, bordes, formatos inválidos, llamadas repetidas, fechas y zonas horarias, y permisos. Un caso que rompe el punto es `FALLA`, con el caso en la evidencia y su tipo de fallo.
