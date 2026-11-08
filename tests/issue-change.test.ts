import { expect, test } from 'claude-code/testing'

import { parseChange, renderChange } from '../lib/change'
import { parseBody, renderBody, type IssueBody } from '../lib/issue'
import { attachPlan, changeFromIssue, criteriaOf, newLogLines, planFromChange, planInBody } from '../lib/issue-change'

const BODY: IssueBody = {
  problem: 'Los clientes solo pagan por transferencia.',
  quote: 'Quiero cobrar con tarjeta.',
  outcome: 'El cliente paga con tarjeta y el pedido queda pagado.',
  criteria: ['El pago empieza pendiente', 'Solo pendiente pasa a pagado o fallido'],
  route: 'CHANGE',
  origin: {},
}

const PLAN = [
  '<!-- seckert:plan',
  'status: approved',
  'specs: [pagos]',
  'branch: feature/modelo-de-pagos',
  'issue: #51',
  '-->',
  '',
  '## Open questions',
  '',
  '## Tasks',
  '',
  '- [x] T1 Tabla pagos y migración · `7d2b10c` <!-- commit: 7d2b10c -->',
  '- [ ] T2 Estados del pago <!-- commit: -->',
  '',
  '## Testing',
  '',
  '- Runner: bun test',
  '',
  '## Log',
  '',
  '- **L1** (pedido original, verbatim): cobrar con tarjeta',
  '',
].join('\n')

test('el change se arma con el título y el body del issue más el plan', () => {
  const text = changeFromIssue({ title: 'Modelo de pagos', body: BODY, plan: PLAN, design: 'https://claude.ai/artifact/abc' })
  const change = parseChange(text)
  expect(change).toMatchObject({ status: 'approved', specs: ['pagos'], branch: 'feature/modelo-de-pagos', issue: '51', design: 'https://claude.ai/artifact/abc', title: 'Modelo de pagos' })
  expect(change.what).toEqual(BODY.criteria)
  expect(change.tasks).toEqual([
    { id: 'T1', text: 'Tabla pagos y migración', done: true, commit: '7d2b10c' },
    { id: 'T2', text: 'Estados del pago', done: false, commit: null },
  ])
  expect(text).toContain('## Why\n\nLos clientes solo pagan por transferencia.\n\n> Quiero cobrar con tarjeta.\n\nEl cliente paga con tarjeta y el pedido queda pagado.\n')
})

test('el plan es el change sin título, Why ni What, con los metadatos ocultos y el commit visible', () => {
  const text = changeFromIssue({ title: 'Modelo de pagos', body: BODY, plan: PLAN, design: null })
  expect(planFromChange(text)).toBe(PLAN)
})

test('un change nuevo con issue se guarda como plan sin Why ni What', () => {
  const text = renderChange({ slug: 'modelo-de-pagos', title: 'Modelo de pagos', why: 'x', what: ['x'], tasks: ['Tabla pagos'], pedido: 'cobrar', issue: '51' })
  const plan = planFromChange(text)
  expect(plan.startsWith('<!-- seckert:plan\nstatus: proposed\nspecs: []\nbranch: feature/modelo-de-pagos\nissue: #51\n-->\n')).toBe(true)
  expect(plan).not.toContain('## Why')
  expect(plan).not.toContain('## What')
  expect(plan).not.toContain('design:')
  expect(plan).toContain('- [ ] T1 Tabla pagos <!-- commit: -->')
})

test('los criterios salen del What del change', () => {
  const text = changeFromIssue({ title: 'Modelo de pagos', body: BODY, plan: PLAN, design: null })
  expect(criteriaOf(text.replace('- Solo pendiente pasa a pagado o fallido', '- Solo pendiente pasa a pagado o fallido\n- El monto va en centavos'))).toEqual([...BODY.criteria, 'El monto va en centavos'])
})

test('las líneas nuevas del Log son las que no estaban antes', () => {
  const before = PLAN
  const after = PLAN.replace('verbatim): cobrar con tarjeta\n', 'verbatim): cobrar con tarjeta\n- 2026-11-09: aprobado ("dale").\n- 2026-11-09: T2 hecha (3fa91e4).\n')
  expect(newLogLines(before, after)).toEqual(['2026-11-09: aprobado ("dale").', '2026-11-09: T2 hecha (3fa91e4).'])
})

test('sin artifacts, el plan va en ## Plan del body con los títulos un nivel abajo, y se lee igual', () => {
  const body = renderBody(BODY)
  const withPlan = attachPlan(body, PLAN)
  expect(withPlan).toContain('\n## Plan\n\n<!-- seckert:plan\n')
  expect(withPlan).toContain('\n### Tasks\n')
  expect(withPlan).not.toMatch(/^## Tasks$/m)
  expect(parseBody(withPlan)).toEqual(BODY)
  expect(planInBody(withPlan)).toBe(PLAN)
  expect(planInBody(body)).toBeNull()
})

test('reemplazar el plan del body no duplica la sección ni toca el resto', () => {
  const once = attachPlan(renderBody(BODY), PLAN)
  const twice = attachPlan(once, PLAN.replace('status: approved', 'status: done'))
  expect(twice.match(/^## Plan$/gm)).toHaveLength(1)
  expect(planInBody(twice)).toContain('status: done')
  expect(parseBody(twice)).toEqual(BODY)
})
