import { expect, test } from 'claude-code/testing'

import { checkTransition, deriveState, labelOf, parseBody, renderBody, stateOf, type Issue } from '../lib/issue'

const ISSUE: Issue = {
  title: 'Exportar pedidos a CSV',
  context: 'El cliente quiere bajar los pedidos del mes para su contador.',
  quote: 'Necesito un botón que me baje todo en Excel a fin de mes.',
  criteria: ['Hay un botón "Exportar" en la lista de pedidos', 'El CSV trae fecha, cliente y total'],
  route: 'CHANGE',
  origin: { meeting: 'sdd/reuniones/2026-11-06-acme.md', date: '2026-11-06', client: 'Acme' },
}

test('el cuerpo se escribe con secciones fijas y se lee de vuelta igual', () => {
  const body = renderBody(ISSUE)
  expect(body).toContain('## Context')
  expect(body).toContain('> Necesito un botón que me baje todo en Excel a fin de mes.')
  expect(body).toContain('- [ ] El CSV trae fecha, cliente y total')
  expect(body).toContain('## Route\n\nCHANGE')
  const { title, ...rest } = ISSUE
  expect(parseBody(body)).toEqual(rest)
})

test('sin cita ni origen el cuerpo sigue siendo válido', () => {
  const issue: Issue = { title: 'Arreglar typo', context: 'Dice "Comprra".', criteria: ['Dice "Comprar"'], route: 'FIX', origin: {} }
  const { title, ...rest } = issue
  expect(parseBody(renderBody(issue))).toEqual(rest)
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
