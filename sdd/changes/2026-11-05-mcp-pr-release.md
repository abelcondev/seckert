---
status: done
specs: [pr]
design: none
branch: feature/mcp-pr-release
---

# MCP de seckert: cuerpo del PR y notas de versión

## Why

Parte 3 de 3: después de `mcp-verificar-base`. Hoy `done` y `release` arman a mano el cuerpo del PR (con `## Risk` y `## Evidence`), la base del PR según el flujo de ramas y la versión siguiente. Son cálculos sobre el diff, el Log y `git log`, y `detect-flow.sh` ya los resuelve en shell.

## What

- `pr_draft(slug)`: devuelve la base del PR según el flujo detectado, el título y el cuerpo con `## Why`, `## What`, `## Testing`, `## Risk` (archivos delicados del diff contra la base: migraciones, auth, pagos, `.github/workflows`, config de despliegue, y las tareas sensibles) y `## Evidence` (la última línea `verify:` y los `PREEXISTENTE`). Claude solo escribe `## How to revert`.
- `release_draft(version?)`: propone la versión (feat sube minor, solo fix sube patch), la rama `release/x.y.z` según el flujo y las notas desde el último tag cruzadas con los changes `done`.
- El flujo de ramas sale de `detect-flow.sh`, que sigue siendo el único lugar que lo detecta (también lo usa `guard-branch.sh`).
- `done` y `release` usan las herramientas; push, PR y release en GitHub siguen siendo pasos que Claude hace solo si el usuario lo pide.
- Las skills se achican: lo que ya hacen las herramientas o el contexto de inicio no se repite en el markdown. `workflow` (la más larga) deja solo las reglas de decisión. El costo por pedido con seckert se mide con las evals contra los $0,200 de 0.7.0.

## Open questions


## Tasks

- [x] T1 `pr_draft` con tests (riesgo con y sin archivos delicados, sin verify) <!-- commit: 7cd3a69 -->
- [x] T2 `release_draft` con tests (solo PRs y gitflow) <!-- commit: 7cd3a69 -->
- [x] T3 `done` y `release` usan las herramientas; eval `pr-riesgo` <!-- commit: 4464790 -->
- [x] T4 Achicar las skills (`workflow`, `next`, `verify`, `change`, `done`, `release`) sin perder reglas <!-- commit: 4464790 -->
- [x] T5 Evals completas (`--runs 3`) con números y costo en `evals/RESULTS.md` <!-- commit: ff0e73a -->

## Testing

- Runner: `bun test`, `claude plugin eval .`
- Nivel: risk

## Log

- **L1** (pedido original, verbatim): dale hagamos solo el mcp de seckert, lo del hub lo veremos en el futuro ahora cerramos con el mcp revisa una vez mas como encararemos el mcp, porque capaz hay cosas hechas que se pueden pasar a un mcp
- 2026-11-05: aprobado ("arranca con la parte 2 y 3"). Rama feature/mcp-pr-release desde main.
- 2026-11-05: la rama sale de `feature/mcp-verificar-base` (parte 2, sin mergear todavía), porque las dos tocan el servidor; el PR va encadenado.
- 2026-11-05: T1 hecha (7cd3a69). Tests primero (vistos fallar); `bun run test:mcp` 33 pass: Risk con tarea de dinero, migración y pagos; sin nada sensible; sin verificar; base develop en gitflow y main para hotfix. Encontró y arregló un corte de `PREEXISTENTE` en el primer punto (tests/envio.spec.ts salía tests/envio).
- 2026-11-05: T2 hecha (7cd3a69). Tests primero (vistos fallar); minor con feat (1.3.2 → 1.4.0), patch con solo fix, versión indicada respetada y rechazada si no es x.y.z; notas sin docs/chore; changes done desde el tag; archivos de versión detectados. `bun run test:mcp` 33 pass.
- 2026-11-05: T4 amplía su alcance a pedido del usuario ("capaz los skills debemos tenerlo en ingles y partes importantes en ingles, eso baja me parece los tokens"): skills, agente, contexto de inicio y descripciones de las herramientas en inglés; quedan en castellano las frases que dispara el usuario, los textos de ejemplo para responderle y lo que se escribe en los changes. Medido con `workflow`: 2.048 tokens en castellano, 1.627 en inglés (−21%).
- 2026-11-05: T3 hecha (4464790). `done` arma el PR con `pr_draft` y solo completa How to revert; `release` parte de `release_draft`. `claude plugin validate .` pasa; la conducta la miden las evals completas de T5 (`pr-riesgo` incluida).
- 2026-11-05: T4 hecha (4464790). Skills de 5.259 a 4.201 palabras contando navegador.md y el agente; `workflow` de 1.577 a 777 palabras y −21% de tokens por estar en inglés (2.048 → 1.627, medido con claude -p). `bun run test:mcp` 33 pass, `claude plugin test .` 35 pass.
- 2026-11-05: T5 hecha (ff0e73a). Evals completas --runs 3 (13 casos repetidos tras el corte por límite de uso): 51/51 con seckert, 21/51 sin seckert, respuestas en castellano. `devtools-ausente` había bajado a 2/3 por la skill recortada; con la oferta explícita en verify, 3/3, y `qa-sin-navegador` sigue 3/3. Costo con seckert $0,172 por pedido, igual que 0.6.0; en los 7 casos de 0.7.0, $0,200 → $0,190.
- 2026-11-05 verify: PASA "`pr_draft(slug)`: devuelve la base del PR según el flujo detectado, el título y el cuerpo con `## Why`, `## What`, `## Testing`, `## Risk` (archivos delicados del diff contra la base: migraciones, auth, pagos, `.github/workflows`, config de despliegue, y las tareas sensibles) y `## Evidence` (la última línea `verify:` y los `PREEXISTENTE`). Claude solo escribe `## How to revert`"; PASA "`release_draft(version?)`: propone la versión (feat sube minor, solo fix sube patch), la rama `release/x.y.z` según el flujo y las notas desde el último tag cruzadas con los changes `done`"; PASA "El flujo de ramas sale de `detect-flow.sh`, que sigue siendo el único lugar que lo detecta (también lo usa `guard-branch.sh`)"; PASA "`done` y `release` usan las herramientas; push, PR y release en GitHub siguen siendo pasos que Claude hace solo si el usuario lo pide"; PASA "Las skills se achican: lo que ya hacen las herramientas o el contexto de inicio no se repite en el markdown. `workflow` (la más larga) deja solo las reglas de decisión. El costo por pedido con seckert se mide con las evals contra los $0,200 de 0.7.0". Comandos: `bun run test:mcp (33 pass)`, `claude plugin test . (37 pass)`, `claude plugin validate .`, `llamadas MCP en vivo a pr_draft y release_draft`.
- 2026-11-05: cerrado ("cerralas").
