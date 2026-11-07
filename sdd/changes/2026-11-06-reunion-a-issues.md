---
status: proposed
specs: [issues, reuniones]
design: none
branch: feature/reunion-a-issues
---

# De la reunión a issues en borrador

## Why

Parte 2 de 3: después de `issues-tracker`. Las notas de una reunión con el cliente se convierten en issues en `draft`, que el usuario filtra antes de que nadie toque código (filtro 1).

## What

- Una skill `reunion` recibe una transcripción (archivo, texto pegado o URL del notetaker) y propone issues canónicos citando lo que dijo el cliente.
- Los issues se crean en `draft` y se muestran en una lista numerada; el usuario aprueba, edita o descarta cada uno («1 y 3 dale, sacá el 2»).
- La transcripción se guarda en `sdd/reuniones/<fecha>-<cliente>.md` y cada issue la enlaza.
- Si un punto ya tiene un issue abierto, se propone comentarlo en vez de duplicarlo.

## Open questions

- **P1** ¿Qué notetaker usás o querés usar? Opciones con API/webhook: Fireflies, tl;dv, Granola, Recall.ai (bot propio). Recomiendo empezar con archivo o texto pegado, que funciona con cualquiera, y sumar el webhook después.

## Tasks

- [ ] T1 [datos] Formato de `sdd/reuniones/` y lectura de transcripciones (txt, md, vtt) <!-- commit: -->
- [ ] T2 Skill `reunion`: extracción a issues canónicos con citas <!-- commit: -->
- [ ] T3 Triage: aprobar, editar o descartar por número con `issue_transition` <!-- commit: -->
- [ ] T4 Detección de duplicados contra los issues abiertos <!-- commit: -->
- [ ] T5 Evals con 3 transcripciones de ejemplo <!-- commit: -->

## Testing

- Runner: bun run test
- Nivel: risk
- Lógica: Tests primero en lib/ y mcp/ para el modelo y los adaptadores (con el tracker simulado)
- Presentación: No aplica

## Log

- **L1** (pedido original, verbatim): quiero crear encima de esto una capa que cree issues en linear o en github issues (evalua ambos y otras alternativas) porque quiero crear todo un hub de desarrollo, desde que hay una reu con el cliente, con una AI tomando notas, que esas notas se conviertan en issues y que esos issues pasen por claude code y por mi filtro y que termine en una pr y merge
