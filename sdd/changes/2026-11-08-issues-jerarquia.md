---
status: approved
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

- [ ] T1 [datos] Lectura de padre, sub-issues y dependencias en el adaptador de GitHub <!-- commit: -->
- [ ] T2 Crear sub-issues y dependencias desde el MCP (`issue_create` con `parent` y `blocked_by`) <!-- commit: -->
- [ ] T3 `tomar` sobre una feature padre: propuesta de partes y creación de sub-issues <!-- commit: -->
- [ ] T4 Aviso al tomar un sub-issue bloqueado y cierre del padre <!-- commit: -->
- [ ] T5 Evals: feature con dos partes y un FIX <!-- commit: -->

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
