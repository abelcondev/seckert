---
status: approved
specs: [issues, tablero]
design: none
branch: feature/tablero-github
---

# Tablero en GitHub Projects: estado, prioridad, estimación y cycles

## Why

Parte 4 de 4: después de `issues-jerarquia`. Para reemplazar Linear hace falta ver los issues en un tablero, con prioridad, estimación y cycles. GitHub Projects lo cubre y funciona con cuentas personales.

## What

- Un GitHub Project del repo muestra los issues de seckert en un tablero por Status. seckert mueve la columna sola: Draft, Approved, In Progress, In Review y Done.
- Cada issue tiene Priority (Urgent, High, Medium, Low) y Size (estimación) como campos del Project.
- Los cycles son el campo Iteration del Project. ¿Qué entra en este cycle? lista los issues del cycle actual.
- Un issue nuevo entra solo al Project.
- El tablero es opcional: sin un Project enlazado al repo, seckert no hace nada con Projects. Si no se puede actualizar el tablero, la operación del issue no falla: avisa.
- In Review y Done no pasan por seckert (el PR y el merge): `board_sync` reconcilia el tablero con el estado real, y las skills la llaman después de abrir el PR y del merge.

## Open questions


## Tasks

- [x] T1 Encontrar el Project enlazado al repo o crearlo con el nombre del repo y enlazarlo; asegurar Status (Draft, Approved, In Progress, In Review, Done), Priority, Size e Iteration de 2 semanas <!-- commit: 57e1fa5 -->
- [x] T2 Sincronizar Status con los estados de seckert al aprobar, tomar, abrir el PR y mergear <!-- commit: e6578d5 -->
- [x] T3 Priority, Size e Iteration desde `issue_create` y una herramienta para editarlos <!-- commit: a2ed0ef -->
- [x] T4 Consultas: issues del cycle actual, por prioridad <!-- commit: ad5c2ba -->
- [ ] T5 Evals: crear, priorizar y mover un issue en el tablero <!-- commit: -->

## Testing

- Runner: bun run test
- Nivel: risk
- Lógica: Tests en mcp/ con el gh falso extendido a gh project
- Presentación: No aplica

## Log

- **L1** (pedido original, verbatim): quiero utilizar a gh issues como el reemplazo a linear, actualmente usamos linear donde se define las tareas: fixes, features completas (divididos en varios issues y sub issues) en este caso quiero utilizarlo para reemplazar a Linear, ese es el objetivo
- **L2** P1: Priority y Size como campos del Project. El usuario aprobó la recomendación: «dale».
- **L3** P2: Cycles de 2 semanas. El usuario aprobó la recomendación: «dale».
- **L4** `gh project field-create` no crea campos Iteration (solo TEXT, SINGLE_SELECT, DATE y NUMBER). Probablemente el campo de cycles haya que crearlo a mano en la web del Project; se confirma con el token nuevo.
- 2026-11-08: aprobado ("dale"). Rama feature/tablero-github desde main.
- 2026-11-08: pendientes al aprobar: P3.
- **L5** P3: El login de gh de abelcondev tiene ahora el scope `project` (gh auth refresh -s project). `gh project list` responde.
- **L6** La API GraphQL sí crea campos Iteration (`createProjectV2Field` con `ITERATION` e `iterationConfiguration`: startDate, duration, iterations) y cambia las opciones de Status (`updateProjectV2Field` con `singleSelectOptions`). No hace falta crear nada a mano.
- 2026-11-08: T1 hecha (57e1fa5). bun run test exit 0; tests/board.test.ts: sin Project enlazado lo crea con el nombre del repo y lo enlaza, deja Status con los 5 estados conservando el id de In Progress, crea Priority, Size y Cycle desde el lunes 2026-11-09 con 14 días; con todo listo no escribe nada. Sin probar contra GitHub real
- **L7** Prueba real de T1 sobre abelcondev/seckert: creó el Project «seckert» (#2, https://github.com/users/abelcondev/projects/2) enlazado al repo, con Status (5 estados), Priority, Size y Cycle (3 iteraciones de 14 días desde el lunes 2026-11-02). Una segunda corrida no escribió nada.
- 2026-11-08: T2 hecha (e6578d5). bun run test exit 0; mcp/board.spec.ts 5/5: crear, aprobar y tomar dejan Draft, Approved e In Progress; board_sync pone In Review con PR abierto y Done al cerrar, solo lo que cambió; descartar archiva; sin Project no hay llamadas a project; con el tablero roto el issue se crea y avisa. Contra GitHub real solo T1
- 2026-11-08: T3 hecha (a2ed0ef). bun run test exit 0; board.spec: issue_create con High, M y current deja p1, z2 e it1; issue_plan Urgent y next cambia solo eso a p0 e it2; none quita el cycle; un cycle inexistente y sin tablero fallan diciendo por qué. Real: la consulta de iteraciones del Project #2 devuelve 3 cycles y resuelve current = Cycle 1, next = Cycle 2
- 2026-11-08: T4 hecha (ad5c2ba). bun run test exit 0; board.spec: board_list por defecto da Cycle 1 con Urgente antes que Baja, next da Próximo y all los 4 por prioridad; la consulta GraphQL de items corre sin errores contra el Project real #2
