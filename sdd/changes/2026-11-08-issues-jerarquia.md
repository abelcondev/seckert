---
status: done
specs: [issues]
design: none
branch: feature/issues-jerarquia
---

# Features con sub-issues y dependencias

## Why

Parte 3 de 4: después de `issue-como-change`. En Linear, una feature completa se divide en issues y sub-issues con un orden. GitHub tiene sub-issues y dependencias nativos, y `gh` 2.94+ los maneja.

## What

- Una feature es un issue padre (`type:feature`) con sub-issues nativos de GitHub. Cada sub-issue es una parte que se trabaja sola: un CHANGE o un FIX.
- Al tomar una feature padre, seckert propone la división en partes y, con tu «dale», crea los sub-issues en orden, ya aprobados: el «dale» aprueba la división y queda como aprobación de cada uno.
- El orden entre partes se marca con dependencias nativas (`blocked-by`). Tomar un sub-issue bloqueado avisa qué falta y pide confirmar.
- Las tareas internas de un change (T1, T2…) siguen en su plan (el artifact `Plan`, o `sdd/changes` sin modo issues): no son sub-issues.
- Cuando se cierran todos los sub-issues, seckert ofrece cerrar la feature padre.
- El diseño de la feature es un artifact `link` del padre. Al dividirla, cada sub-issue que toca pantallas recibe su propio link al diseño.

## Open questions

## Tasks

- [x] T1 [datos] Lectura de padre, sub-issues y dependencias en el adaptador de GitHub <!-- commit: ccc885c -->
- [x] T2 Crear sub-issues y dependencias desde el MCP (`issue_create` con `parent` y `blocked_by`) <!-- commit: fd0424e -->
- [x] T3 `tomar` sobre una feature padre: propuesta de partes y creación de sub-issues <!-- commit: e891359 -->
- [x] T4 Aviso al tomar un sub-issue bloqueado y cierre del padre <!-- commit: c19cb31 -->
- [x] T5 Evals: feature con dos partes y un FIX <!-- commit: 42823ac -->

## Testing

- Runner: bun run test
- Nivel: risk
- Lógica: Tests en mcp/ con el gh falso extendido a sub-issues y dependencias
- Presentación: No aplica

## Log

- **L1** (pedido original, verbatim): quiero utilizar a gh issues como el reemplazo a linear, actualmente usamos linear donde se define las tareas: fixes, features completas (divididos en varios issues y sub issues) en este caso quiero utilizarlo para reemplazar a Linear, ese es el objetivo
- **L2** Pasa a ser la Parte 3 de 4, después de `issue-como-change`: cada sub-issue es un change que vive en su issue, con su artifact `plan`.
- **L3** Ajustado después de `issue-como-change`: las tareas viven en el plan del issue y los sub-issues nacen aprobados con el «dale» de la división, como muestra la página del flujo.
- 2026-11-08: aprobado ("mergea, y segui"). Rama feature/issues-jerarquia desde main.
- 2026-11-08: T1 hecha (ccc885c). bun run test exit 0; github.test: gh issue view pide parent,subIssues,blockedBy y el tracker devuelve parent 50, sub-issues 51 cerrado y 52 abierto, bloqueado por 49 abierto; sin relaciones, vacíos
- 2026-11-08: T2 hecha (fd0424e). bun run test exit 0; issues.spec: issue_create con parent 1 y blockedBy [2] llama a gh con --parent 1 --blocked-by 2; issue_get del #3 da parent 1 y bloqueado por #2, y el #1 lista los sub-issues 2 y 3
- 2026-11-08: T3 hecha (e891359). bun run test exit 0; issues.spec: issue_take del padre con dos sub-issues no crea rama ni llama a develop y devuelve las partes (#3 bloqueada por #2) con next #2; skill tomar propone la división y crea los sub-issues con parent, blockedBy y diseño
- 2026-11-08: T4 hecha (c19cb31). bun run test exit 0; issues.spec: tomar #3 bloqueado falla nombrando #2 Modelo de pagos y no cambia de rama, con force lo toma; issue_close con partes abiertas falla nombrando #2, con todas cerradas issue_take del padre da done y next null, e issue_close lo cierra completed con el comentario 2 de 2
- 2026-11-08: T5 hecha (42823ac). claude plugin eval: feature-en-partes 3/3 y parte-bloqueada 3/3; regresión de los 10 casos de issues con 1 corrida, todos pasan; bun run test exit 0
- 2026-11-08 verify: PASA "Una feature es un issue padre (`type:feature`) con sub-issues nativos de GitHub. Cada sub-issue es una parte que se trabaja sola: un CHANGE o un FIX"; PASA "Al tomar una feature padre, seckert propone la división en partes y, con tu «dale», crea los sub-issues en orden, ya aprobados: el «dale» aprueba la división y queda como aprobación de cada uno"; PASA "El orden entre partes se marca con dependencias nativas (`blocked-by`). Tomar un sub-issue bloqueado avisa qué falta y pide confirmar"; PASA "Las tareas internas de un change (T1, T2…) siguen en su plan (el artifact `Plan`, o `sdd/changes` sin modo issues): no son sub-issues"; PASA "Cuando se cierran todos los sub-issues, seckert ofrece cerrar la feature padre"; PASA "El diseño de la feature es un artifact `link` del padre. Al dividirla, cada sub-issue que toca pantallas recibe su propio link al diseño". Comandos: `bun run test`, `claude plugin eval . --tag jerarquia --runs 3`, `claude plugin eval . --tag issues --runs 1`.
- 2026-11-08: cerrado ("dale").
