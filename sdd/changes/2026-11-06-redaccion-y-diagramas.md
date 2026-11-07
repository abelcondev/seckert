---
status: done
specs: [changes, pr]
design: none
branch: feature/redaccion-y-diagramas
---

# Redacción controlada y diagramas en la propuesta

## Why

Cuanto más trabajo hace Claude solo, más tiempo pasa el usuario revisando: la propuesta, el informe de verificación y el PR. Hoy esos textos no siguen reglas de estilo, y la propuesta de un cambio con schema o con un flujo de varios pasos no tiene ningún diagrama.

## What

- Propuestas, informes de verificación, cuerpos de PR, notas de release y las respuestas del chat siguen reglas de redacción controlada ("STE-lite"): frases de ~20 palabras como máximo, una idea por frase, voz activa, un mismo término para cada cosa y nada de relleno.
- Si un CHANGE toca el schema o un flujo de varios pasos, su propuesta incluye un diagrama Mermaid: `erDiagram` para el modelo de datos y `flowchart` para el flujo, con antes y después si cambia algo existente.
- Un cambio chico (FIX o SPEC) o un CHANGE sin schema ni flujo no lleva diagrama.
- El diagrama queda en `sdd/changes/<slug>.md`, así que GitHub lo dibuja en el PR.
- El diagrama se pasa con el parámetro `diagram` de `change_create`, que lo escribe en una sección `## Diagram` fija, después de What.

## Open questions


## Tasks

- [x] T1 Reglas de redacción STE-lite en `skills/workflow/SKILL.md` (sección corta), referenciadas desde change, verify, done y release; versión de una línea en `scripts/session-context.sh` para que valga también en el chat <!-- commit: c0eef29 -->
- [x] T2 Parámetro opcional `diagram` en `change_create` que escribe una sección `## Diagram` después de What, con test en `mcp/template.spec.ts` <!-- commit: fad4dd9 -->
- [x] T3 `skills/change/SKILL.md`: cuándo pasar `diagram` (schema → erDiagram, flujo → flowchart, antes/después) y cuándo no <!-- commit: 6b67f46 -->
- [x] T4 Specs: regla de redacción y regla del diagrama en `sdd/specs/changes.md` <!-- commit: bc4c527 -->
- [x] T5 Evals: solo un grader de diagrama en `change-cupones` (sin casos nuevos) y métrica de palabras por frase en `evals/metrics.ts` (solo informa, ningún grader falla por el largo) <!-- commit: cc70e4e -->
- [x] T6 Correr solo `change-cupones`, con seckert y sin baseline (`--runs 3 --ablation none`), y anotar los resultados en `evals/RESULTS.md` <!-- commit: e1cdfd5 -->
- [x] T7 Bug: el lector descarta un punto del What (o una pregunta) que nombra algo entre `<…>` dentro de backticks, como `` `<slug>` ``; test que lo reproduce y fix <!-- commit: 0fa6df3 -->

## Testing

- Runner: bun run test:mcp
- Nivel: risk
- Lógica: Test en mcp/template.spec.ts para la sección ## Diagram
- Presentación: `change-cupones` con seckert, --runs 3 --ablation none

## Log

- **L1** (pedido original, verbatim): dale, armá la propuesta del 1 y 2
- **L2** P1: el diagrama va como parámetro de `change_create`, no lo agrega la skill a mano ("p1. parametro").
- **L3** P2: las reglas de redacción valen también para el chat; van al contexto de sesión, que se carga siempre ("p2. para todo y chat").
- **L4** P3: las ~20 palabras por frase son una guía; la métrica las muestra, pero no hacen fallar ningún caso ("p3. guia").
- 2026-11-06: aprobado ("ok dale"). Rama feature/redaccion-y-diagramas desde main.
- **L5** T5 y T6 recortados: sin caso ni grader nuevo para lo obvio (un FIX nunca crea change, así que no puede tener diagrama) y sin brazo sin seckert ("no hagamos evals para cosas obvias").
- 2026-11-06: T1 hecha (c0eef29). Sección Writing en seckert:workflow, línea en session-context.sh y referencias en change, verify, done y release; bun run test:mcp 33 pass, 0 fail.
- 2026-11-06: T2 hecha (fad4dd9). Tests nuevos en template.spec.ts y pr.spec.ts fallaron primero y pasan después; bun run test:mcp 34 pass, 0 fail. pr_draft también copia ## Diagram al cuerpo del PR.
- 2026-11-06: T3 hecha (6b67f46). skills/change/SKILL.md: paso 4 con `diagram` (schema → erDiagram, flujo → flowchart, antes y después, sin schema ni flujo no lleva) y al iterar se actualiza ## Diagram.
- 2026-11-06: T4 hecha (bc4c527). sdd/specs/changes.md con ## Diagrama y ## Redacción; sdd/specs/pr.md menciona ## Diagram en el cuerpo y el borrador del PR.
- 2026-11-06: T5 hecha (cc70e4e). Grader diagrama.md (change_create con diagram erDiagram/flowchart) en change-cupones; metrics.ts suma "Palabras por frase", probado sobre una traza vieja de change-cupones: 9,9.
- 2026-11-06: T6 hecha (e1cdfd5). change-cupones 3/3 (sin diagrama, correcto) y change-grande-partes 3/3 con erDiagram, --runs 3 --ablation none, $1,36; anotado en evals/RESULTS.md. El grader de diagrama pasó de cupones a partes.
- **L6** T5/T6: el grader de diagrama pasó de `change-cupones` a `change-grande-partes`. En cupones no corresponde diagrama: el repo de prueba no tiene base de datos y aplicar el cupón es un solo paso.
- 2026-11-06 verify: PASA "Propuestas, informes de verificación, cuerpos de PR, notas de release y las respuestas del chat siguen reglas de redacción controlada ("STE-lite"): frases de ~20 palabras como máximo, una idea por frase, voz activa, un mismo término para cada cosa y nada de relleno"; PASA "Si un CHANGE toca el schema o un flujo de varios pasos, su propuesta incluye un diagrama Mermaid: `erDiagram` para el modelo de datos y `flowchart` para el flujo, con antes y después si cambia algo existente"; PASA "Un cambio chico (FIX o SPEC) o un CHANGE sin schema ni flujo no lleva diagrama"; PASA "El diagrama se pasa con el parámetro `diagram` de `change_create`, que lo escribe en una sección `## Diagram` fija, después de What". Comandos: `bun run test:mcp (34 pass, 0 fail)`.
- **L7** T7 nueva: la verificación encontró que `verify_record` rechaza el punto del What que menciona `` `<slug>` ``. `PLACEHOLDER` en `lib/change.ts` lo confunde con un hueco de la plantilla ("dale, arreglalo").
- 2026-11-06: T7 hecha (0fa6df3). mcp/parse.spec.ts falló primero (el punto con `<slug>` desaparecía) y pasa con isPlaceholder, que ignora lo que está entre backticks; bun run test:mcp 35 pass, 0 fail.
- 2026-11-06 verify: PASA "Propuestas, informes de verificación, cuerpos de PR, notas de release y las respuestas del chat siguen reglas de redacción controlada ("STE-lite"): frases de ~20 palabras como máximo, una idea por frase, voz activa, un mismo término para cada cosa y nada de relleno"; PASA "Si un CHANGE toca el schema o un flujo de varios pasos, su propuesta incluye un diagrama Mermaid: `erDiagram` para el modelo de datos y `flowchart` para el flujo, con antes y después si cambia algo existente"; PASA "Un cambio chico (FIX o SPEC) o un CHANGE sin schema ni flujo no lleva diagrama"; PASA "El diagrama queda en `sdd/changes/<slug>.md`, así que GitHub lo dibuja en el PR"; PASA "El diagrama se pasa con el parámetro `diagram` de `change_create`, que lo escribe en una sección `## Diagram` fija, después de What". Comandos: `bun run test:mcp (35 pass, 0 fail)`.
- **L8** Rama rebasada sobre `main` después del merge de #22 (recorte de evals). Los hashes de T1–T6 son de antes del rebase; los nuevos son, en orden: 4398082, 34a02e0, 2d48800, 79589fd, 8b10794 y 1c6aa52.
- 2026-11-06: cerrado ("dale, cerralo y abrí el PR mergea luego").
