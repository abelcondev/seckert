import { expect, test } from 'claude-code/testing'

import { renderBody, type Issue } from '../lib/issue'
import { githubTracker, type Gh } from '../lib/trackers/github'

const ISSUE: Issue = {
  title: 'Exportar pedidos a CSV',
  problem: 'El cliente quiere bajar los pedidos del mes.',
  outcome: 'Los pedidos del mes se bajan en un archivo.',
  criteria: ['Hay un botón "Exportar"'],
  route: 'CHANGE',
  origin: { client: 'Acme' },
}

// Un gh simulado: anota cada llamada y responde según el subcomando.
function fakeGh(replies: Record<string, string> = {}) {
  const calls: { args: string[]; input?: string }[] = []
  const gh: Gh = (args, input) => {
    calls.push({ args, input })
    const key = Object.keys(replies).find(k => args.join(' ').startsWith(k))
    return key ? replies[key]! : ''
  }
  return { gh, calls }
}

const view = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    number: 12,
    title: ISSUE.title,
    body: renderBody(ISSUE),
    url: 'https://github.com/o/r/issues/12',
    state: 'OPEN',
    stateReason: '',
    labels: [{ name: 'seckert:draft' }],
    closedByPullRequestsReferences: [],
    ...over,
  })

test('crear asegura la label, manda el cuerpo por stdin y devuelve el issue', () => {
  const { gh, calls } = fakeGh({ 'issue create': 'https://github.com/o/r/issues/12\n', 'issue view': view() })
  const created = githubTracker('o/r', gh).create(ISSUE, 'draft')
  expect(calls[0]!.args).toEqual(['label', 'create', 'seckert:draft', '--repo', 'o/r', '--force', '--color', expect.any(String)])
  expect(calls[1]!.args).toEqual(['issue', 'create', '--repo', 'o/r', '--title', ISSUE.title, '--body-file', '-', '--label', 'seckert:draft'])
  expect(calls[1]!.input).toBe(renderBody(ISSUE))
  expect(created).toMatchObject({ id: '12', url: 'https://github.com/o/r/issues/12', state: 'draft', title: ISSUE.title, route: 'CHANGE' })
})

test('leer devuelve el issue canónico; un aprobado sin rama sigue aprobado', () => {
  const { gh, calls } = fakeGh({ 'issue view': view({ labels: [{ name: 'bug' }, { name: 'seckert:approved' }] }) })
  const issue = githubTracker('o/r', gh).get('12')
  expect(calls[0]!.args.slice(0, 5)).toEqual(['issue', 'view', '12', '--repo', 'o/r'])
  expect(calls[1]!.args).toEqual(['issue', 'develop', '--list', '12', '--repo', 'o/r'])
  expect(issue.state).toBe('approved')
  expect(issue.criteria).toEqual(['Hay un botón "Exportar"'])
})

test('un aprobado con rama enlazada está en curso', () => {
  const { gh } = fakeGh({
    'issue view': view({ labels: [{ name: 'seckert:approved' }] }),
    'issue develop --list': 'feature/12-exportar\thttps://github.com/o/r/tree/feature/12-exportar\n',
  })
  expect(githubTracker('o/r', gh).get('12').state).toBe('in-progress')
})

test('con un PR enlazado abierto está en PR, sin mirar la rama', () => {
  const { gh, calls } = fakeGh({ 'issue view': view({ labels: [{ name: 'seckert:approved' }], closedByPullRequestsReferences: [{ number: 30 }] }) })
  expect(githubTracker('o/r', gh).get('12').state).toBe('in-review')
  expect(calls.some(c => c.args.includes('develop'))).toBe(false)
})

test('cerrado por un merge es cerrado; cerrado como no planeado es descartado', () => {
  const closed = fakeGh({ 'issue view': view({ state: 'CLOSED', stateReason: 'COMPLETED', labels: [{ name: 'seckert:approved' }] }) })
  expect(githubTracker('o/r', closed.gh).get('12').state).toBe('closed')
  const dropped = fakeGh({ 'issue view': view({ state: 'CLOSED', stateReason: 'NOT_PLANNED', labels: [{ name: 'seckert:approved' }] }) })
  expect(githubTracker('o/r', dropped.gh).get('12').state).toBe('discarded')
})

test('listar trae los issues de seckert y filtra por estado leído', () => {
  const list = JSON.stringify([
    JSON.parse(view()),
    JSON.parse(view({ number: 13, labels: [{ name: 'bug' }] })),
    JSON.parse(view({ number: 14, labels: [{ name: 'seckert:approved' }], closedByPullRequestsReferences: [{ number: 30 }] })),
  ])
  const { gh, calls } = fakeGh({ 'issue list': list })
  const tracker = githubTracker('o/r', gh)
  expect(tracker.list().map(i => i.id)).toEqual(['12', '14'])
  expect(calls[0]!.args).toContain('open')
  expect(tracker.list('in-review').map(i => i.id)).toEqual(['14'])
  expect(calls.at(-1)!.args).toContain('all')
})

test('un issue que no escribió seckert en la lista no rompe: se salta', () => {
  const list = JSON.stringify([JSON.parse(view({ body: 'a mano' })), JSON.parse(view({ number: 14 }))])
  const { gh } = fakeGh({ 'issue list': list })
  expect(githubTracker('o/r', gh).list().map(i => i.id)).toEqual(['14'])
})

test('mover el triage cambia la label', () => {
  const { gh, calls } = fakeGh()
  githubTracker('o/r', gh).setState('12', 'draft', 'approved')
  expect(calls.at(-1)!.args).toEqual(['issue', 'edit', '12', '--repo', 'o/r', '--remove-label', 'seckert:draft', '--add-label', 'seckert:approved'])
})

test('descartar además cierra el issue como no planeado', () => {
  const { gh, calls } = fakeGh()
  githubTracker('o/r', gh).setState('13', 'in-progress', 'discarded')
  expect(calls.find(c => c.args[1] === 'edit')!.args).toEqual(['issue', 'edit', '13', '--repo', 'o/r', '--remove-label', 'seckert:approved', '--add-label', 'seckert:discarded'])
  expect(calls.at(-1)!.args).toEqual(['issue', 'close', '13', '--repo', 'o/r', '--reason', 'not planned'])
})

test('un estado que lee GitHub no se escribe', () => {
  const { gh } = fakeGh()
  expect(() => githubTracker('o/r', gh).setState('12', 'approved', 'in-progress')).toThrow()
})
