// La plantilla que leen las personas (skills/workflow/template.md) y la que
// escribe change_create tienen que tener las mismas secciones y campos.
import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { renderChange } from '../lib/change'

const template = readFileSync(resolve(import.meta.dir, '../skills/workflow/template.md'), 'utf8')

const shape = (text: string) => text.match(/^(## .+|[a-z]+:|- \*\*L1\*\*)/gm)

test('change_create sigue la plantilla', () => {
  const rendered = renderChange({
    slug: 'x',
    title: 'X',
    why: 'w',
    what: ['a'],
    tasks: ['t'],
    questions: ['q'],
    specs: [],
    pedido: 'p',
  })
  expect(shape(rendered)).toEqual(shape(template))
})

test('change_create con diagram escribe ## Diagram con un bloque mermaid, después de What', () => {
  const base = { slug: 'x', title: 'X', why: 'w', what: ['a'], tasks: ['t'], pedido: 'p' }
  const rendered = renderChange({ ...base, diagram: '```mermaid\nflowchart LR\n  A --> B\n```' })
  expect(rendered).toContain('## What\n\n- a\n\n## Diagram\n\n```mermaid\nflowchart LR\n  A --> B\n```\n\n## Open questions')
  expect(renderChange({ ...base, diagram: 'erDiagram\n  CUPON ||--o{ PEDIDO : aplica' })).toContain(
    '## Diagram\n\n```mermaid\nerDiagram\n  CUPON ||--o{ PEDIDO : aplica\n```\n',
  )
  expect(renderChange(base)).not.toContain('## Diagram')
})
