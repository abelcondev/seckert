---
status: done
specs: [verify, changes]
design: none
branch: feature/mcp-changes
---

# MCP de seckert: los changes se leen y escriben con herramientas

## Why

Parte 1 de 3. Hoy Claude edita `sdd/changes/*.md` a mano siguiendo el markdown de las skills: cambia el `status`, marca `- [x]` con el commit, escribe el Log y cuenta las rondas de `verify:`. Cuando lo hace mal, el flujo se rompe. El único 4/5 del benchmark (`verify-segunda-ronda`) fue un `verify (2ª ronda):` mal escrito. Además, la lectura de un change está duplicada en `session-context.sh` y `register.tsx`, y las skills se releen en cada turno: seckert cuesta $0,17 por pedido contra $0,15 sin seckert. Un servidor MCP dentro del plugin pasa esas reglas a código. Las herramientas no tienen el límite de 10 segundos de los hooks del módulo, así que las partes 2 y 3 caben en el mismo servidor.

## What

**Servidor**
- El plugin trae un servidor MCP `seckert` (stdio, declarado en `.mcp.json`) que arranca solo al habilitar el plugin, sin `npm install` ni configuración del usuario.
- Se compila a un solo archivo JS que viene en el plugin; en la máquina del usuario solo hace falta `node`.
- La lógica de leer y escribir un change vive en un único módulo (`lib/change.ts`), que usan el servidor, el módulo `register.tsx` (la barra) y el contexto de inicio.

**Herramientas** (6, con nombres y parámetros cortos; el resto queda detrás de ToolSearch)
- `change_list()`: los changes con status, tareas hechas/total, siguiente tarea, preguntas abiertas, rama y último `verify:`. Reemplaza la lectura de `seckert:status`.
- `change_get(slug)`: un change ya estructurado: What como lista de puntos, tareas con su commit, preguntas abiertas y rondas de verify por punto.
- `change_create(slug, title, why, what[], tasks[], questions[], design?, specs[], pedido)`: escribe el archivo con la plantilla, la fecha de hoy, `status: proposed`, `branch: feature/<slug>` y `L1` con el pedido verbatim.
- `change_transition(slug, to, aprobacion?)`: solo permite `proposed → approved → done`. Al aprobar, crea `feature/<slug>` desde la base detectada (o se cambia a ella si ya existe), la anota en `branch:` y escribe la línea del Log. Para aprobar o cerrar exige `aprobacion` con las palabras textuales del usuario ("dale"); el módulo comprueba que aparecen en el último mensaje del usuario y, si no, rechaza la llamada. Sin diálogo de confirmación: el "dale" alcanza.
- `lib/change.ts` lee las preguntas abiertas numeradas (`- **P1** …`) y también las viejas sin número.
- `task_complete(slug, task, commit, evidencia)`: marca `- [x]` solo si el commit existe en la rama y escribe la línea del Log con la evidencia.
- `verify_record(slug, filas[], preexistentes[], comandos[])`: escribe la línea `- <fecha> verify: …` siempre con el mismo formato, reabre las tareas de los puntos que fallan y, si un punto falla por tercera vez, no lo reabre y lo deja en `## Preguntas abiertas`. Devuelve `{ reabiertas[], tercera_vez[] }`.

**Lo que hace cumplir el módulo**
- Si Claude intenta cambiar con Edit o Write la línea `status:` de un change o marcar `- [x]`, el módulo lo rechaza con un mensaje que nombra la herramienta que corresponde.

**Skills**
- `next`, `change`, `verify`, `done` y `status` dicen cuándo llamar a cada herramienta en vez de explicar el formato del archivo. `status` queda en pocas líneas.

**Lo que no cambia**
- `guard-branch.sh` sigue siendo un hook: un MCP no puede bloquear un `git push`.
- El recorte de salidas (`compact.ts`) y la barra siguen en el módulo.
- El formato de `sdd/changes/*.md` no cambia: los changes existentes se leen igual.

## Preguntas abiertas


## Tasks

- [x] T1 `lib/change.ts`: leer y escribir un change (status, tareas, Log, preguntas, rondas de verify por punto), con tests primero (transformación de datos) <!-- commit: 0647da3 -->
- [x] T2 Servidor MCP con el SDK oficial, compilado con `bun build` a `mcp/dist/server.mjs`, `.mcp.json` con `${CLAUDE_PLUGIN_ROOT}`; herramientas `change_list` y `change_get` <!-- commit: 64ed6a4 -->
- [x] T3 `change_create` con la plantilla <!-- commit: 3daeda4 -->
- [x] T4 `change_transition` y `task_complete` (sensible: aprobación), con la comprobación de la aprobación en el módulo <!-- commit: b7d3799 -->
- [x] T5 `verify_record` con el tope de 3 rondas <!-- commit: f12da08 -->
- [x] T6 Un solo lector: `register.tsx` usa `lib/change.ts` y `session-context.sh` llama al mismo bundle en modo CLI <!-- commit: a4e0eeb -->
- [x] T7 Módulo: rechazar Edit/Write que cambian `status:` o marcan `- [x]` en `sdd/changes` <!-- commit: 7564455 -->
- [x] T8 Recortar `next`, `change`, `verify`, `done` y `status` para que usen las herramientas <!-- commit: f431c7c -->
- [x] T9 Evals (`--runs 3`): `verify-segunda-ronda`, `verify-tercera-ronda`, `aprobar-con-dale`, `change-cupones`, `iterar-propuesta`; números y costo por pedido en `evals/RESULTS.md` <!-- commit: 685c492 -->

## Testing

- Runner: `claude plugin test .` (lib y módulo), `bun run test:mcp` (compila el servidor y lo prueba por stdio) y `claude plugin eval .` (comportamiento)
- Nivel: risk
- Lógica: tests de `lib/change.ts` (lectura y escritura, conteo de rondas, transiciones inválidas); test de cada herramienta contra un repo temporal; test del módulo que rechaza la aprobación sin palabras del usuario y la edición directa de `status:`.
- Presentación: no aplica

## Log

- **L1** (pedido original, verbatim): dale hagamos solo el mcp de seckert, lo del hub lo veremos en el futuro ahora cerramos con el mcp revisa una vez mas como encararemos el mcp, porque capaz hay cosas hechas que se pueden pasar a un mcp
- 2026-11-05: partido en 3. Parte 2 `mcp-verificar-base` (los tests en la base pasan del verificador a una herramienta) y parte 3 `mcp-pr-release` (cuerpo del PR y notas de versión). Quedan fuera el hub de agencia (más adelante) y la instalación del navegador de `navegador.md` (instala cosas en la máquina: sigue en la skill).
- 2026-11-05: P1 resuelta: la aprobación se comprueba con las palabras del usuario en su último mensaje, sin diálogo ("vamos con tu recomendacion que es mas organica"). El diálogo obligaba a decir "dale" dos veces y no corre en las evals.
- 2026-11-05: aprobado ("dale"). Rama feature/mcp-changes desde main.
- 2026-11-05: T1 hecha (0647da3). `lib/change.ts` lee y escribe status, rama, tareas, preguntas numeradas, Log y la línea verify; cuenta los fallos por punto también en líneas viejas como `verify (2ª ronda):`. Tests primero: vistos fallar (no existía el módulo) y después `claude plugin test .` 22 pass, 0 fail; type-check limpio. Los tests corren con `claude plugin test .`, no con `bun test`.
- 2026-11-05: T2 hecha (64ed6a4). Servidor con el SDK oficial 1.32.2, compilado a `mcp/dist/server.mjs` (0,38 MB, `.mjs` para que node lo lea como ESM sin depender del package.json); `.mcp.json` en la raíz del plugin. Test primero, visto fallar (sin servidor); `bun run test:mcp` 6 pass (lista sin done, con done, get por slug, sin slug, slug inexistente, desde una subcarpeta). En una sesión real (`claude -p --plugin-dir .`) Claude llamó `mcp__plugin_seckert_seckert__change_list` y recibió los 3 changes. `claude plugin test .` 22 pass. Pendiente: el type-check no cubre `mcp/` (faltan los tipos de node).
- 2026-11-05: el pendiente de T2 quedó resuelto en T3: `@types/node`, `@types/bun` y `mcp/tsconfig.json`; `bun run test:mcp` ahora compila, corre `tsc -p mcp` y los tests.
- 2026-11-05: T3 hecha (3daeda4). `change_create` escribe el change con la plantilla, la fecha de hoy, `feature/<slug>`, preguntas P1… y L1 verbatim (también multilínea); no pisa uno existente y rechaza slugs que no son kebab-case. Tests primero, vistos fallar (herramienta inexistente); `bun run test:mcp` 10 pass, con uno que compara las secciones contra `skills/workflow/template.md` para que no se separen. `claude plugin test .` 22 pass; type-check limpio en los dos tsconfig.
- 2026-11-05: T4 hecha (b7d3799). `change_transition`: proposed → approved → done; al aprobar crea `feature/<slug>` desde la base de `detect-flow.sh` (probado con develop); con preguntas abiertas o tareas sin hacer falla hasta que se repite con `pendientes: true`, y las anota. `task_complete`: rechaza commits inexistentes o fuera de la rama; marca con el hash corto. El módulo rechaza `aprobacion` que no esté en el último mensaje del usuario (sin importar mayúsculas, tildes ni puntuación). Tests primero, vistos fallar; `bun run test:mcp` 17 pass, `claude plugin test .` 25 pass, type-check limpio. En sesión real (`claude -p --plugin-dir .`): aprobacion "cuatro" rechazada por el módulo con el change intacto; "dale" en el mensaje aprueba y crea `feature/csv`.
- 2026-11-05: T5 hecha (f12da08). `verify_record` escribe la línea verify con formato fijo, exige puntos nombrados como en el What (o "Diseño") y tareas a reabrir en cada FALLA; al tercer fallo deja la pregunta con el número siguiente y no reabre, contando también rondas viejas `verify (2ª ronda):`. Tests primero (5, vistos fallar); `bun run test:mcp` 22 pass, `claude plugin test .` 25 pass.
- 2026-11-05: T6 hecha (a4e0eeb). `register.tsx` lee con `lib/change.ts` (se fue su parser propio) y `session-context.sh` llama a `server.mjs --context` (0,12 s); `slugOf` vive en la lib. Test nuevo del contexto de inicio, escrito antes del refactor y pasando antes y después. `bun run test:mcp` 23 pass, `claude plugin test .` 25 pass, type-check limpio. Si no hay node, el contexto de inicio no lista los changes (la barra sí).
- 2026-11-05: T7 hecha (7564455). Edit y Write sobre `sdd/changes/*.md` que cambian `status:` o marcan `- [x]` se rechazan nombrando `change_transition` o `task_complete`; reabrir una tarea, editar el What y crear un change en proposed pasan. La barra también se refresca tras una herramienta del MCP. Tests primero (3 de 4 vistos fallar); `claude plugin test .` 29 pass. No cubre ediciones por Bash (sed): queda como límite conocido.
- 2026-11-05: T8 hecha (f431c7c). `next`, `change`, `verify`, `done`, `status` y `workflow` nombran las herramientas; `status` declara las dos de lectura en `allowed-tools`. Entra en el mismo commit lo de las preguntas numeradas (plantilla y skills), pedido aparte en la conversación. Las skills no quedaron mucho más cortas (38 líneas nuevas, 37 quitadas): el ahorro, si lo hay, lo miden las evals de T9. `claude plugin validate .` pasa.
- 2026-11-05: T9 hecha (685c492). Evals con `--runs 3`, `--mocks off` y el MCP permitido, en 7 casos (los 5 del plan más `verify-preexistente` y `pr-riesgo`, cuyas skills también cambiaron): 21/21 con seckert, 3/21 sin seckert; `verify-segunda-ronda` pasa de 4/5 a 3/3. Costo con seckert $0,200 por pedido contra $0,189 en 0.6.0 (+6%): no bajó. Ajustados dos graders que medían la forma (rama con `git switch -c`, archivo con Write). $9,06 en total, con una repetición de `change-cupones` por un grader mal escrito.
- 2026-11-05 verify: PASA los 15 puntos del What (servidor stdio en `.mcp.json` sin `npm install`; bundle único que solo necesita node, regenerado idéntico; lector único en `lib/change.ts`; las 6 herramientas; `change_list`, `change_get`, `change_create`, `change_transition` y `task_complete` contra un repo temporal; aprobación comprobada por el módulo; preguntas numeradas y viejas; `verify_record` con tercera vez en P2; guardián de Edit/Write; skills; lo que no cambia). Detalle menor: una tarea sin commit queda `<!-- commit:  -->` con dos espacios. Comandos: `bun run test:mcp` (23 pass), `claude plugin test .` (29 pass), llamadas MCP directas al bundle.
- 2026-11-05: cerrado ("cerralo"). Specs: `sdd/specs/changes.md` (nueva) y `sdd/specs/verify.md`.
