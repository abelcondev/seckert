import { expect, test } from 'claude-code/testing'

import { branchFor, checkTransition, deriveState, labelOf, parseBody, renderBody, stateOf, type Issue } from '../lib/issue'

const ISSUE: Issue = {
  title: 'Exportar pedidos a CSV',
  problem: 'El contador necesita los pedidos del mes y hoy se copian a mano.',
  quote: 'Necesito un botón que me baje todo en Excel a fin de mes.',
  outcome: 'Los pedidos del mes se bajan en un archivo con un clic.',
  criteria: ['Hay un botón "Descargar CSV" en la lista de pedidos', 'Cuando lo toco, entonces baja un CSV con fecha, cliente y total'],
  decisions: [{ text: 'Separador ;', by: 'Abel', date: '2026-11-09' }],
  outOfScope: ['Exportar a Excel nativo'],
  constraints: ['No cambiar la API de pedidos'],
  references: ['src/Pedidos.tsx'],
  questions: [{ id: 'P1', text: '¿Incluimos los pedidos cancelados?', owner: 'Abel' }],
  route: 'FIX',
  routeWhy: 'una pantalla y un export, sin dinero',
  origin: { source: 'Reunión semanal con Acme', date: '2026-11-06', client: 'Acme', requestedBy: 'Juan' },
}

test('el cuerpo v2 se escribe con secciones fijas en inglés y se lee de vuelta igual', () => {
  const body = renderBody(ISSUE)
  expect(body.startsWith('<!-- seckert:issue v2 -->\n')).toBe(true)
  const order = ['## Problem', '## Outcome', '## Acceptance criteria', '## Decisions', '## Out of scope', '## Constraints', '## References', '## Open questions', '## Route', '## Origin']
  const at = order.map(h => body.indexOf(`\n${h}\n`))
  expect(at.every(i => i > 0)).toBe(true)
  expect([...at].sort((a, b) => a - b)).toEqual(at)
  expect(body).toContain('> Necesito un botón que me baje todo en Excel a fin de mes.')
  expect(body).toContain('- [ ] Cuando lo toco, entonces baja un CSV con fecha, cliente y total')
  expect(body).toContain('- Separador ; — Abel, 2026-11-09')
  expect(body).toContain('- **P1** ¿Incluimos los pedidos cancelados? — decide: Abel')
  expect(body).toContain('## Route\n\nFIX: una pantalla y un export, sin dinero')
  expect(body).toContain('- Requested by: Juan')
  const { title, ...rest } = ISSUE
  expect(parseBody(body)).toEqual(rest)
})

test('las secciones opcionales vacías no se escriben', () => {
  const issue: Issue = { title: 'Arreglar typo', problem: 'Dice "Comprra".', outcome: 'Dice "Comprar".', criteria: ['Dice "Comprar"'], route: 'FIX', origin: {} }
  const body = renderBody(issue)
  for (const h of ['## Decisions', '## Out of scope', '## Constraints', '## References', '## Open questions']) expect(body).not.toContain(h)
  expect(body).toContain('## Origin\n\n-')
  const { title, ...rest } = issue
  expect(parseBody(body)).toEqual(rest)
})

test('un issue v1 (o con la marca sin versión) se sigue leyendo', () => {
  const v1 = ['<!-- seckert:issue v1 -->', '', '## Context', '', 'El cliente quiere bajar los pedidos.', '', '> Un botón para Excel.', '', '## Acceptance criteria', '', '- [ ] Hay un botón', '', '## Route', '', 'CHANGE', '', '## Origin', '', '- Meeting: Reunión con Acme', '- Date: 2026-11-06', '- Client: Acme', ''].join('\n')
  const expected = { problem: 'El cliente quiere bajar los pedidos.', quote: 'Un botón para Excel.', outcome: '', criteria: ['Hay un botón'], route: 'CHANGE', origin: { source: 'Reunión con Acme', date: '2026-11-06', client: 'Acme' } }
  expect(parseBody(v1)).toEqual(expected)
  expect(parseBody(v1.replace('<!-- seckert:issue v1 -->', '<!-- seckert:issue -->'))).toEqual(expected)
})

test('una versión del contrato que seckert no conoce no se parsea', () => {
  expect(() => parseBody(renderBody(ISSUE).replace('v2', 'v3'))).toThrow(/v3/)
})

test('faltar una sección obligatoria al escribir es un error', () => {
  expect(() => renderBody({ ...ISSUE, outcome: ' ' })).toThrow(/Outcome/)
  expect(() => renderBody({ ...ISSUE, criteria: [] })).toThrow(/criteri/)
})

test('un cuerpo que no escribió seckert no se parsea', () => {
  expect(() => parseBody('Algo escrito a mano')).toThrow()
})

test('el triage vive en una label seckert:<estado>', () => {
  expect(labelOf('approved')).toBe('seckert:approved')
  expect(stateOf(['bug', 'seckert:approved'])).toBe('approved')
  expect(stateOf(['bug'])).toBeNull()
})

test('dos labels de triage es un error, no se adivina', () => {
  expect(() => stateOf(['seckert:draft', 'seckert:approved'])).toThrow()
})

test('en curso, en PR y cerrado se leen de GitHub', () => {
  const open = { triage: 'approved' as const, closed: false, notPlanned: false, openPr: false, branch: false }
  expect(deriveState(open)).toBe('approved')
  expect(deriveState({ ...open, branch: true })).toBe('in-progress')
  expect(deriveState({ ...open, branch: true, openPr: true })).toBe('in-review')
  expect(deriveState({ ...open, closed: true })).toBe('closed')
  expect(deriveState({ ...open, closed: true, notPlanned: true })).toBe('discarded')
  expect(deriveState({ ...open, triage: 'discarded', closed: true })).toBe('discarded')
  expect(deriveState({ ...open, triage: null })).toBeNull()
})

test('a mano solo se mueve el triage', () => {
  expect(checkTransition('draft', 'discarded')).toBeNull()
  expect(checkTransition('approved', 'discarded')).toBeNull()
  expect(checkTransition('in-progress', 'discarded')).toBeNull()
  expect(checkTransition('approved', 'in-progress')).toContain('GitHub')
  expect(checkTransition('in-review', 'closed')).toContain('GitHub')
  expect(checkTransition('closed', 'approved', 'dale')).toContain('closed')
})

test('aprobar exige las palabras del usuario', () => {
  expect(checkTransition('draft', 'approved')).toContain('palabras')
  expect(checkTransition('draft', 'approved', '   ')).toContain('palabras')
  expect(checkTransition('draft', 'approved', 'dale')).toBeNull()
})

test('la rama de un issue no termina en un conector al cortar el título', () => {
  expect(branchFor('Cambiar el texto del botón del checkout', 'FIX')).toBe('fix/cambiar-el-texto-del-boton')
})
