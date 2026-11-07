---
status: done
specs: [verify]
design: none
branch: feature/mcp-verificar-base
---

# MCP de seckert: comprobar fallos en la base con una herramienta

## Why

Parte 2 de 3: después de `mcp-changes`. Hoy `seckert-verifier` sigue 5 pasos escritos en su prompt para decidir si un test es `PREEXISTENTE`: buscar la base, revisar si cambiaron dependencias, crear un worktree, enlazar `node_modules`, correr los tests y borrar el worktree. Es un procedimiento fijo y largo (más de 10 segundos), justo lo que conviene pasar a una herramienta del MCP.

## What

- Herramienta `tests_on_base(tests[], runner)`: devuelve `PREEXISTENTE` o `FALLA` por test, con el motivo y el comando que se corrió.
- Mismas reglas que hoy: si el change tocó `package.json` o un lockfile, si el test no existe en la base o si no se pudo correr ahí, el resultado es `FALLA`. El worktree se borra siempre, aunque algo falle a mitad de camino.
- `seckert-verifier` la tiene en su lista de `tools:` y su prompt se reduce a llamarla.
- Un Bash que nombra `sdd/changes` (y no es solo `git`) no puede cambiar el `status:` ni marcar `- [x]`: el módulo guarda esas líneas antes, las compara después y, si cambiaron, restaura el archivo y dice qué herramienta usar.
- Una tarea sin commit queda `<!-- commit: -->`, con un solo espacio, como en la plantilla.
- La sección de preguntas se llama `## Open questions`, en inglés como las demás (Why, What, Tasks, Testing, Log). Los changes viejos con `## Preguntas abiertas` se siguen leyendo y escribiendo.

## Open questions


## Tasks

- [x] T1 `tests_on_base` con tests contra un repo temporal (base con y sin el fallo, lockfile cambiado, test inexistente) <!-- commit: 1bfacca -->
- [x] T2 `seckert-verifier` usa la herramienta; eval `verify-preexistente` <!-- commit: b8caa23 -->
- [x] T3 Módulo: control después de un Bash que toca `sdd/changes` (status y `- [x]`), con restauración <!-- commit: fe09433 -->
- [x] T4 Formato `<!-- commit: -->` con un solo espacio en las tareas sin commit <!-- commit: 58641bc -->
- [x] T5 `## Open questions` en la plantilla, la lib, las skills y las evals; leer también `## Preguntas abiertas` <!-- commit: 47b2798 -->

## Testing

- Runner: `bun test`, `claude plugin eval .`
- Nivel: risk

## Log

- **L1** (pedido original, verbatim): dale hagamos solo el mcp de seckert, lo del hub lo veremos en el futuro ahora cerramos con el mcp revisa una vez mas como encararemos el mcp, porque capaz hay cosas hechas que se pueden pasar a un mcp
- 2026-11-05: aprobado ("arranca con la parte 2 y 3"). Rama feature/mcp-verificar-base desde main.
- 2026-11-05: T1 hecha (1bfacca). Tests primero (4 de 5 vistos fallar sin la herramienta); `bun run test:mcp` 28 pass con PREEXISTENTE, pasa en la base, test inexistente, runner que no corre, node_modules enlazado, lockfile cambiado y worktree borrado; `claude plugin test .` 29 pass.
- 2026-11-05: T2 hecha (b8caa23). Eval `verify-preexistente` (--runs 3, MCP real): 3/3 con seckert, 0/3 sin seckert, $0,18 por pedido con seckert (antes $0,20); en las 3 trazas el verificador llamó `tests_on_base` y no hubo `git worktree add` a mano. `seckert-verifier.md` pasa de 35 a 31 líneas.
- 2026-11-05: T5 agregada a pedido del usuario: "en vez de 'Preguntas abiertas' ponlo en ingles".
- 2026-11-05: T3 hecha (fe09433). Tests primero (2 de 3 vistos fallar): sed que cambia el status y python que marca T2 se restauran y nombran la herramienta; editar el What por sed pasa; git y comandos sin sdd/changes no se miran. `claude plugin test .` 32 pass, `bun run test:mcp` 28 pass, type-check limpio.
- 2026-11-05: T4 hecha (58641bc). Test primero, visto fallar (salía con dos espacios); `claude plugin test .` 33 pass, `bun run test:mcp` 28 pass.
- 2026-11-05: T5 hecha (47b2798). Tests primero (2 vistos fallar): la lib lee y escribe `## Open questions` y sigue con `## Preguntas abiertas`; `claude plugin test .` 35 pass, `bun run test:mcp` 28 pass (verify.spec sigue con el encabezado viejo). Evals --runs 3: verify-tercera-ronda 3/3 vs 0/3, iterar-propuesta 3/3 vs 3/3, change-cupones 3/3 vs 0/3.
- 2026-11-05 verify: PASA "Herramienta `tests_on_base(tests[], runner)`: devuelve `PREEXISTENTE` o `FALLA` por test, con el motivo y el comando que se corrió"; PASA "Mismas reglas que hoy: si el change tocó `package.json` o un lockfile, si el test no existe en la base o si no se pudo correr ahí, el resultado es `FALLA`. El worktree se borra siempre, aunque algo falle a mitad de camino"; PASA "`seckert-verifier` la tiene en su lista de `tools:` y su prompt se reduce a llamarla"; PASA "Un Bash que nombra `sdd/changes` (y no es solo `git`) no puede cambiar el `status:` ni marcar `- [x]`: el módulo guarda esas líneas antes, las compara después y, si cambiaron, restaura el archivo y dice qué herramienta usar"; PASA "Una tarea sin commit queda `<!-- commit: -->`, con un solo espacio, como en la plantilla"; PASA "La sección de preguntas se llama `## Open questions`, en inglés como las demás (Why, What, Tasks, Testing, Log). Los changes viejos con `## Preguntas abiertas` se siguen leyendo y escribiendo". Comandos: `bun run test:mcp (28 pass tras el arreglo de fecha 6933e43; antes 5 fallos PREEXISTENTE por zona horaria)`, `claude plugin test . (35 pass)`, `claude plugin validate .`.
- 2026-11-05: cerrado ("cerralas").
