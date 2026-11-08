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

## Open questions


## Tasks

- [ ] T1 Encontrar el Project enlazado al repo o crearlo con el nombre del repo y enlazarlo; asegurar Status (Draft, Approved, In Progress, In Review, Done), Priority, Size e Iteration de 2 semanas <!-- commit: -->
- [ ] T2 Sincronizar Status con los estados de seckert al aprobar, tomar, abrir el PR y mergear <!-- commit: -->
- [ ] T3 Priority, Size e Iteration desde `issue_create` y una herramienta para editarlos <!-- commit: -->
- [ ] T4 Consultas: issues del cycle actual, por prioridad <!-- commit: -->
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
