// El lector de changes descarta los huecos de la plantilla (`<comportamiento>`),
// pero no un punto real que nombra algo entre <…> dentro de backticks.
import { expect, test } from 'bun:test'

import { failuresByPoint, parseChange, verifyLine, verifyRows } from '../lib/change'

const change = `---
status: approved
specs: []
design: none
branch: feature/x
---

# X

## What

- <comportamiento>
- El diagrama queda en \`sdd/changes/<slug>.md\`.

## Open questions

- **P1** <pregunta>
- **P2** ¿Va en \`feature/<slug>\`?

## Tasks

- [ ] T1 t <!-- commit: -->

## Log
`

test('un punto o una pregunta con <…> entre backticks no es un hueco de la plantilla', () => {
  const parsed = parseChange(change)
  expect(parsed.what).toEqual(['El diagrama queda en `sdd/changes/<slug>.md`.'])
  expect(parsed.questions.map(q => q.id)).toEqual(['P2'])
})

// Un punto del What puede tener comillas: "STE-lite", un texto citado del usuario.
test('un punto con comillas se lee entero en la línea verify, para Evidence y para contar fallos', () => {
  const quoted = 'Usa redacción controlada ("STE-lite"): frases cortas (unas 20 palabras)'
  const line = verifyLine('2026-11-06', {
    rows: [
      { point: quoted, verdict: 'FALLA', evidence: 'skills/x.md (línea 3) no lo dice' },
      { point: 'Otro punto', verdict: 'PASA' },
    ],
    commands: ['bun test'],
  })
  expect(verifyRows(line)).toEqual([
    { verdict: 'FALLA', point: quoted, detail: 'skills/x.md (línea 3) no lo dice' },
    { verdict: 'PASA', point: 'Otro punto', detail: null },
  ])
  expect(failuresByPoint(`## Log\n\n- ${line}\n`).get(quoted)).toBe(1)
})
