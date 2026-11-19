import { expect, test } from 'claude-code/testing'

import { AWAITING_LABEL, awaitingOf, branchFor, checkTransition, similarIssues, deriveState, labelOf, parseBody, renderBody, stateOf, updateIssue, type Issue } from '../lib/issue'

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

test('dos issues son parecidos si comparten al menos dos palabras con contenido', () => {
  const a = { title: 'totalConDescuento devuelve el descuento en vez del total', problem: 'Con $100 y 10% da $10.' }
  expect(similarIssues({ title: 'Corregir totalConDescuento', problem: 'Devuelve el descuento.' }, [{ id: '1', ...a }]).map(i => i.id)).toEqual(['1'])
  expect(similarIssues({ title: 'Botón de confirmar', problem: 'El checkout dice Enviar.' }, [{ id: '1', ...a }])).toEqual([])
})

test('seckert espera al usuario con un draft con preguntas o un change propuesto', () => {
  const q = [{ id: 'P1', text: '¿x?' }]
  expect(AWAITING_LABEL).toBe('seckert:awaiting')
  expect(awaitingOf({ state: 'draft', questions: q })).toBe(true)
  expect(awaitingOf({ state: 'draft', questions: [] })).toBe(false)
  expect(awaitingOf({ state: 'draft' })).toBe(false)
  expect(awaitingOf({ state: 'approved', questions: q })).toBe(false)
  expect(awaitingOf({ state: 'in-progress', change: 'proposed' })).toBe(true)
  expect(awaitingOf({ state: 'in-progress', change: 'approved' })).toBe(false)
  expect(awaitingOf({ state: 'discarded', change: 'proposed' })).toBe(false)
  expect(awaitingOf({ state: 'closed', questions: q })).toBe(false)
})

const BASE = (() => {
  const { title: _t, ...rest } = ISSUE
  return rest
})()
const CTX = { date: '2026-11-19', by: 'Abel' }

test('updateIssue agrega, edita y saca ítems de las listas', () => {
  const { body } = updateIssue(BASE, [
    { op: 'add', section: 'outOfScope', text: 'Exportar a PDF' },
    { op: 'edit', section: 'constraints', item: 'No cambiar la API de pedidos', text: 'No cambiar la API pública de pedidos' },
    { op: 'remove', section: 'references', item: 'src/Pedidos.tsx' },
    { op: 'add', section: 'criteria', text: 'El CSV usa UTF-8' },
  ], CTX)
  expect(body.outOfScope).toEqual(['Exportar a Excel nativo', 'Exportar a PDF'])
  expect(body.constraints).toEqual(['No cambiar la API pública de pedidos'])
  expect(body.references).toBeUndefined()
  expect(body.criteria.at(-1)).toBe('El CSV usa UTF-8')
  const text = renderBody(body)
  expect(text).not.toContain('## References')
  expect(parseBody(text)).toEqual(body)
})

test('updateIssue: una decisión nueva lleva quién y la fecha; editarla los conserva', () => {
  const { body } = updateIssue(BASE, [
    { op: 'add', section: 'decisions', text: 'Fechas en ISO' },
    { op: 'add', section: 'decisions', text: 'Sin totales', by: 'Juan' },
    { op: 'edit', section: 'decisions', item: 'Separador ;', text: 'Separador ; siempre' },
  ], CTX)
  expect(body.decisions).toEqual([
    { text: 'Separador ; siempre', by: 'Abel', date: '2026-11-09' },
    { text: 'Fechas en ISO', by: 'Abel', date: '2026-11-19' },
    { text: 'Sin totales', by: 'Juan', date: '2026-11-19' },
  ])
})

test('updateIssue: una pregunta nueva toma la Pn siguiente, también tras las ya respondidas', () => {
  const first = updateIssue(BASE, [{ op: 'add', section: 'questions', text: '¿Y los reembolsos?', owner: 'Juan' }], CTX)
  expect(first.added).toEqual(['P2'])
  expect(first.body.questions!.at(-1)).toEqual({ id: 'P2', text: '¿Y los reembolsos?', owner: 'Juan' })
  const { questions: _q, ...sin } = BASE
  const after = updateIssue(sin, [{ op: 'add', section: 'questions', text: '¿Otra?' }], { ...CTX, taken: ['P1', 'P3'] })
  expect(after.added).toEqual(['P4'])
  const edited = updateIssue(BASE, [{ op: 'edit', section: 'questions', item: 'P1', text: '¿Y los anulados?' }], CTX)
  expect(edited.body.questions).toEqual([{ id: 'P1', text: '¿Y los anulados?', owner: 'Abel' }])
  expect(updateIssue(BASE, [{ op: 'remove', section: 'questions', item: 'P1' }], CTX).body.questions).toBeUndefined()
})

test('updateIssue reemplaza Problem, Outcome y la cita', () => {
  const { body } = updateIssue(BASE, [
    { op: 'set', section: 'problem', text: 'Nuevo problema.' },
    { op: 'set', section: 'outcome', text: 'Nuevo resultado.' },
    { op: 'set', section: 'quote', text: '' },
  ], CTX)
  expect(body.problem).toBe('Nuevo problema.')
  expect(body.outcome).toBe('Nuevo resultado.')
  expect(body.quote).toBeUndefined()
})

test('updateIssue falla sin tocar nada al vaciar una sección obligatoria o nombrar un ítem que no está', () => {
  const one = { ...BASE, criteria: ['Único'] }
  expect(() => updateIssue(one, [{ op: 'remove', section: 'criteria', item: 'Único' }], CTX)).toThrow('Acceptance criteria')
  expect(() => updateIssue(BASE, [{ op: 'set', section: 'problem', text: ' ' }], CTX)).toThrow('Problem')
  expect(() => updateIssue(BASE, [{ op: 'set', section: 'outcome', text: '' }], CTX)).toThrow('Outcome')
  expect(() => updateIssue(BASE, [{ op: 'remove', section: 'constraints', item: 'No existe' }], CTX)).toThrow('Constraints no tiene «No existe»')
  expect(() => updateIssue(BASE, [{ op: 'add', section: 'outOfScope', text: 'Exportar a Excel nativo' }], CTX)).toThrow('ya tiene')
  expect(() => updateIssue(BASE, [], CTX)).toThrow()
  const before = structuredClone(BASE)
  expect(() => updateIssue(BASE, [{ op: 'add', section: 'outOfScope', text: 'X' }, { op: 'set', section: 'problem', text: '' }], CTX)).toThrow()
  expect(BASE).toEqual(before)
})
