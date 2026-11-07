---
status: done
specs: [changes]
design: none
branch: feature/sdd-por-mcp
---

# Toda la edición de sdd/ pasa por el MCP

## Why

Ningún humano edita a mano los changes ni las specs: todo lo escribe la IA. Hoy solo crear, aprobar, cerrar, marcar tareas y verificar pasan por el MCP; el resto se edita con Edit y su formato depende del modelo. En redaccion-y-diagramas eso falló dos veces: tras el rebase no había forma de actualizar los hashes de las tareas, y el hook restauró el archivo entero y se perdió una verificación sin commitear.

## What

- Claude escribe changes y specs con las herramientas del MCP (`change_update`, `spec_write`) y, si una herramienta no alcanza, puede editar el archivo a mano: no hay bloqueos nuevos. Solo se mantiene la regla de antes: Edit y Write no pueden cambiar el `status:` ni marcar `- [x]`.
- Responder una pregunta borra la `Pn`, escribe la respuesta en What o Tasks y anota en el Log `**Ln** Pn: …` con el número siguiente, en una sola llamada.
- Agregar una pregunta, agregar, partir o reabrir una tarea, editar un punto del What y agregar una línea al Log pasan por el MCP, con la numeración que corresponde (Pn, Tn, Ln).
- Después de un rebase, una herramienta actualiza los hashes de las tareas hechas buscando cada commit por su mensaje en la rama actual, y lo anota en el Log.
- Escribir o cambiar una regla de `sdd/specs/<area>.md` (un `## ` por regla) pasa por el MCP; crea el área si no existe.
- Todas las operaciones sobre un change van en una sola herramienta, `change_update`, con un parámetro que elige la operación.
- Un Bash sobre `sdd/` no se restaura después: no se pierde lo que haga git ni nada sin commitear.

## Open questions


## Tasks

- [x] T1 [datos] `lib/change.ts`: operaciones nuevas con tests (responder y agregar pregunta, tareas agregar/partir/reabrir, What, Log numerado, resincronizar hashes por mensaje de commit) <!-- commit: 922fd46 -->
- [x] T2 [datos] `lib/spec.ts`: leer y escribir una regla de `sdd/specs/<area>.md`, con tests <!-- commit: e15f13e -->
- [x] T3 MCP: herramienta `change_update` con las operaciones de T1 y `spec_write` con la de T2, con tests en `mcp/` <!-- commit: 4a8f7c7 -->
- [x] T4 [datos] Hook: sin bloqueos nuevos sobre `sdd/`; Edit y Write siguen rechazando cambiar `status:` o marcar `- [x]`; se quita la restauración tras un Bash. Tests en `tests/` <!-- commit: 1215ebc -->
- [x] T5 Skills: change, next, verify, done, hotfix y workflow usan las herramientas nuevas en vez de Edit; plantilla y AGENTS template al día <!-- commit: 6028d5b -->
- [x] T6 Specs: `sdd/specs/changes.md` (Edición a mano, herramientas) y regla de specs por MCP <!-- commit: 3812873 -->
- [x] T7 Evals: correr con seckert los casos que editan changes (`change-grande-partes`, `aprobar-con-dale`, `verify-tercera-ronda`), `--runs 3 --ablation none`, y comparar costo con 0.8.0 en `evals/RESULTS.md`. Si sube más de un 10%, parar y revisar con el usuario qué operaciones recortar <!-- commit: 131b969 -->
- [x] T8 Recuperar el eval `iterar-propuesta` con un grader que exige `change_update`, y la operación `task_remove` que su pedido ("Sacá la T3") necesita <!-- commit: aabe0ec -->

## Testing

- Runner: bun run test
- Nivel: risk
- Lógica: Tests primero en lib (T1, T2), mcp/ (T3) y tests/ del módulo (T4)
- Presentación: No aplica; evals de T7 para el costo

## Log

- **L1** (pedido original, verbatim): vamos con la 2,3, la 4 no la hagamos ya que tenemos artifacts en estos tiempos, la 5 verificalo hazlo en el orden que sea mejor
- **L2** P1: una sola herramienta `change_update` con operaciones, no una por operación, para no sumar esquemas ("p1 una sola").
- **L3** P2: el bloqueo vale para `sdd/changes` y `sdd/specs`, como ya dice el What ("p2 los dos").
- **L4** P3: se sigue si el costo por pedido sube 10% o menos frente a 0.8.0; si pasa de ahí, se revisa qué recortar ("p3 seguir si es ≤10%").
- 2026-11-06: aprobado ("sí, dale"). Rama feature/sdd-por-mcp desde main.
- 2026-11-06: T1 hecha (922fd46). 7 tests nuevos en tests/change.test.ts fallaron primero (no cargaba) y pasan con applyOps, addLog y resyncCommits; bun run test: MCP 36, módulo 44, shell sin fallos.
- 2026-11-06: T2 hecha (e15f13e). tests/spec.test.ts (5 tests) falló primero y pasa con lib/spec.ts; reescribir una regla de las 4 specs reales deja el archivo idéntico; bun run test sin fallos.
- 2026-11-06: T3 hecha (4a8f7c7). mcp/update.spec.ts (6 tests, 4 fallaron primero): ops atómicas, sin tocar status, resync de hashes tras un rebase real y spec_write; bun run test:mcp 42 pass, 0 fail.
- 2026-11-06: T4 hecha (c10e22b). tests/guard.test.ts: 5 tests nuevos fallaron primero; Edit/Write sobre changes y specs se rechazan nombrando la herramienta, Bash que escribe en sdd/ no corre (también mezclado con git stash pop), leer y git pasan; claude plugin test 49 pass, validate ok.
- 2026-11-06: T5 hecha (de6e616). workflow, change, next, done y hotfix usan change_update y spec_write; operación diagram nueva (test falló primero) porque seckert:change pide actualizar el diagrama al iterar; bun run test sin fallos.
- **L5** T5: se sumó la operación `diagram` a `change_update`. `seckert:change` pide actualizar el diagrama al iterar la propuesta y, con el bloqueo, no había otra forma.
- 2026-11-06: T6 hecha (801c133). sdd/specs/changes.md escrita con el spec_write del repo: Herramientas, Edición a mano, Editar un change, Hashes tras un rebase, Specs y Diagrama actualizadas.
- 2026-11-06: T7 hecha (131b969). change-grande-partes, aprobar-con-dale y verify-tercera-ronda 3/3 cada uno con seckert; costo +3% frente a 0.8.0 ($0,239 vs $0,233), bajo el tope de 10%; ningún rechazo del hook. $2,15.
- **L6** T8 nueva: el usuario pidió recuperar `iterar-propuesta` ("recuperá iterar-propuesta"). Su pedido quita una tarea y `change_update` no tenía cómo.
- 2026-11-06: T8 hecha (aabe0ec). iterar-propuesta 3/3 con change_update y task_remove (test de task_remove falló primero); con la línea nueva en session-context.sh va change_get → change_update sin Edit y cuesta $0,14 (antes $0,18); bun run test sin fallos.
- 2026-11-06 verify: FALLA ""ningún humano edita manualmente un change o spec md": Claude no puede editar `sdd/changes/*.md` ni `sdd/specs/*.md` con Edit, Write o un Bash que no sea solo git. El rechazo nombra la herramienta del MCP que corresponde" (Edit y Write se rechazan nombrando la herramienta (tests/guard.test.ts). Hueco: `git status && dd of=sdd/changes/a.md` (también `ed`, `install`) no se rechaza ni se restaura, porque WRITER es una lista fija y mayWriteSdd no restaura si hay git.); PASA "Responder una pregunta borra la `Pn`, escribe la respuesta en What o Tasks y anota en el Log `**Ln** Pn: …` con el número siguiente, en una sola llamada"; PASA "Agregar una pregunta, agregar, partir o reabrir una tarea, editar un punto del What y agregar una línea al Log pasan por el MCP, con la numeración que corresponde (Pn, Tn, Ln)"; PASA "Después de un rebase, una herramienta actualiza los hashes de las tareas hechas buscando cada commit por su mensaje en la rama actual, y lo anota en el Log"; PASA "Escribir o cambiar una regla de `sdd/specs/<area>.md` (un `## ` por regla) pasa por el MCP; crea el área si no existe"; PASA "Todas las operaciones sobre un change van en una sola herramienta, `change_update`, con un parámetro que elige la operación"; PASA "Un Bash que mezcla git con una escritura en `sdd/` no pierde los cambios hechos por git: solo se restaura lo que escribió la parte que no es git". Comandos: `bun run test (MCP 42, módulo 51, shell sin fallos)`. T4 reabierta.
- 2026-11-06: T4 hecha (e0bfb88). Tests con dd, ed e install junto a git fallaron primero; con la lista de lectura (lo demás no corre) pasan, y cd+grep, heredoc que nombra sdd/ y git commit siguen pasando; claude plugin test 50 pass, validate ok.
- 2026-11-06 verify: FALLA ""ningún humano edita manualmente un change o spec md": Claude no puede editar `sdd/changes/*.md` ni `sdd/specs/*.md` con Edit, Write o un Bash que no sea solo git. El rechazo nombra la herramienta del MCP que corresponde" (Edit y Write bien. Bash deja pasar `cd sdd/changes && echo x > a.md` (redirección relativa), `sort -o x.md x.md` y `sed -n 1,5p x.md -i`.). Comandos: `bun run test (0 fail)`. T4 reabierta.
- 2026-11-06: T4 hecha (081855f). Los casos de la 2ª ronda (cd + redirección relativa, sort -o, sed -n -i) y otros (>&, >(tee), $(…), rg --pre, find -fprint) fallaron primero y se rechazan; 39 casos de escritura rechazados y 19 de lectura permitidos; bun run test sin fallos.
- 2026-11-06 verify: FALLA ""ningún humano edita manualmente un change o spec md": Claude no puede editar `sdd/changes/*.md` ni `sdd/specs/*.md` con Edit, Write o un Bash que no sea solo git. El rechazo nombra la herramienta del MCP que corresponde" (Edit y Write bien; ~100 comandos de Bash bien. Pasa `sed -n 1p x -ibak`, `-Ei` y `-si` (el -i pegado o agrupado; GNU sed edita en el lugar).). Comandos: `bun run test (MCP 42, módulo 50, shell sin fallos)`. ""ningún humano edita manualmente un change o spec md": Claude no puede editar `sdd/changes/*.md` ni `sdd/specs/*.md` con Edit, Write o un Bash que no sea solo git. El rechazo nombra la herramienta del MCP que corresponde": 3.ª vez: no se reabre, queda en P4.
- **L7** P4: sed sale de la lista de lectura; para leer un rango están head, tail y Read ("p4 sacá sed")
- **L8** T4 reabierta: sacar sed de la lista de lectura (P4)
- 2026-11-06: T4 hecha (4397515). P4: sed salió de la lista de lectura; los casos -ibak, -Ei, -si y sed -n '10,40p' fallaron primero y ahora se rechazan; bun run test sin fallos.
- 2026-11-06 verify: FALLA ""ningún humano edita manualmente un change o spec md": Claude no puede editar `sdd/changes/*.md` ni `sdd/specs/*.md` con Edit, Write o un Bash que no sea solo git. El rechazo nombra la herramienta del MCP que corresponde" (sed y los demás casos se rechazan. Hueco nuevo: el cd persiste entre llamadas; `cd sdd/changes` en una llamada y `echo x > a.md` en la siguiente pasan, porque ninguno nombra sdd junto a la escritura.). Comandos: `bun run test (MCP 42, módulo 50, shell sin fallos)`. ""ningún humano edita manualmente un change o spec md": Claude no puede editar `sdd/changes/*.md` ni `sdd/specs/*.md` con Edit, Write o un Bash que no sea solo git. El rechazo nombra la herramienta del MCP que corresponde": 3.ª vez: no se reabre, queda en P5.
- **L9** P5: sin bloqueos: el MCP es el camino preferido y Claude puede editar sdd/ a mano si una herramienta no alcanza ("tampoco quiero crear bloqueos con esto de agregar el mcp, si no se puede por mcp podemos abrirlo a que claude lo haga, no quiero crear fricciones").
- **L10** T4 reabierta: quitar el bloqueo nuevo; queda solo la regla de status y tareas en Edit y Write, y se quita la restauración tras un Bash (P5).
- **L11** T5 reabierta: las skills dicen preferir las herramientas, no que Edit esté bloqueado (P5).
- **L12** T6 reabierta: la spec Edición a mano vuelve a la regla de status y tareas (P5).
- 2026-11-06: T4 hecha (1215ebc). Tests nuevos (spec editable con Edit/Write, Bash sobre sdd/ sin restaurar) fallaron primero y pasan; Edit/Write siguen rechazando status y [x] (tests de 0.7.0); el hook queda como main menos la restauración tras Bash; bun run test sin fallos.
- 2026-11-06: T5 hecha (6028d5b). workflow, contexto de sesión y descripciones de change_update y spec_write dicen preferir las herramientas y editar a mano si no alcanzan; sin menciones a bloqueos; bun run test sin fallos.
- 2026-11-06: T6 hecha (3812873). Con spec_write: Herramientas (camino preferido), Edición a mano (solo status y [x]; Bash sin control ni restauración) y Specs sin "solo con".
- 2026-11-06 verify: PASA "Claude escribe changes y specs con las herramientas del MCP (`change_update`, `spec_write`) y, si una herramienta no alcanza, puede editar el archivo a mano: no hay bloqueos nuevos. Solo se mantiene la regla de antes: Edit y Write no pueden cambiar el `status:` ni marcar `- [x]`"; PASA "Responder una pregunta borra la `Pn`, escribe la respuesta en What o Tasks y anota en el Log `**Ln** Pn: …` con el número siguiente, en una sola llamada"; PASA "Agregar una pregunta, agregar, partir o reabrir una tarea, editar un punto del What y agregar una línea al Log pasan por el MCP, con la numeración que corresponde (Pn, Tn, Ln)"; PASA "Después de un rebase, una herramienta actualiza los hashes de las tareas hechas buscando cada commit por su mensaje en la rama actual, y lo anota en el Log"; PASA "Escribir o cambiar una regla de `sdd/specs/<area>.md` (un `## ` por regla) pasa por el MCP; crea el área si no existe"; PASA "Todas las operaciones sobre un change van en una sola herramienta, `change_update`, con un parámetro que elige la operación"; PASA "Un Bash sobre `sdd/` no se restaura después: no se pierde lo que haga git ni nada sin commitear". Comandos: `bun run test (MCP 42, módulo 50, shell sin fallos)`.
- 2026-11-06: cerrado ("dale, cerralo, abrí el PR y mergealo y luego actualiza el plugin de los projectos").
