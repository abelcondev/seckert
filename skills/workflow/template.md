---
status: proposed
specs: [<areas de sdd/specs que toca>]
design: <url del artifact de Claude, o "none">
branch: feature/<slug>
---

# <Título>

## Why

<El problema, en 1–3 frases.>

## What

<El comportamiento a construir, en bullets observables. Cita literal al usuario cuando haya textos, errores o ejemplos:>

- <comportamiento>
- Si las fechas están al revés, muestra: "<texto exacto del usuario>"

<Solo si toca el schema o un flujo de varios pasos, aquí va una sección Diagram con un bloque mermaid (la escribe change_create con `diagram`).>

## Open questions

<Decisiones que faltan antes de aprobar, una por línea y numeradas (P1, P2…). Se borran al resolverse (la respuesta pasa a What o Tasks, y el porqué al Log); los números no se reusan ni se corren. Vacía = lista para aprobar.>

- **P1** <pregunta>

## Tasks

- [ ] T1 <paso> <!-- commit: -->
- [ ] T2 <paso> <!-- commit: -->

## Testing

- Runner: `<comando real del proyecto>`
- Nivel: <light | risk | strict, el del proyecto>
- Lógica: <tests añadidos/actualizados, p.ej. tests/foo.test.ts; o por qué no aplica>
- Presentación: <"verificado contra el artifact en la app corriendo", o "no aplica">

## Log

- **L1** (pedido original, verbatim): <pegar sin editar>
