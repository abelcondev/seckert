import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import { barText, roadmapFrom } from '../hooks/roadmap'

const MCP = 'mcp__plugin_seckert_seckert__'

const BAND = {
  plugin: 'seckert',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

const TASKS = [
  { id: 'T1', text: 'Generar el CSV', done: true },
  { id: 'T2', text: 'Endpoint de descarga: GET /pedidos.csv con filtros', done: false },
  { id: 'T3', text: 'Botón Exportar', done: false },
]

// El MCP real responde en content[0].text con JSON.
function engine(on: On, results: Record<string, unknown>) {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('fs.exists', () => ({ value: false }))
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('prompt.submit', (_, e) => ({ text: e.text, context: e.context }))
  on('tool.call', (_, e) => ({ result: { content: [{ type: 'text', text: JSON.stringify(results[e.tool] ?? {}) }] } }))
}

async function bar($: Parameters<Parameters<typeof test>[1]>[0]): Promise<string | null> {
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const line = (await ui.find({ type: 'Text', text: /seckert/ }))?.text ?? null
  await ui.unmount()
  return line
}

test('roadmapFrom lee change_get, task_complete y change_create', () => {
  const got = roadmapFrom(`${MCP}change_get`, {}, JSON.stringify({ slug: 'csv', status: 'approved', tasks: TASKS, questions: [] }))
  expect(got).toEqual({ slug: 'csv', status: 'approved', done: 1, total: 3, next: 'T2 Endpoint de descarga: GET /pedidos.csv con filtros', questions: 0 })

  const created = roadmapFrom(`${MCP}change_create`, { tasks: ['Uno', 'Dos'], questions: ['¿x?'] }, JSON.stringify({ slug: 'nuevo', status: 'proposed' }))
  expect(created).toEqual({ slug: 'nuevo', status: 'proposed', done: 0, total: 2, next: 'T1 Uno', questions: 1 })

  // Un change cerrado saca la barra; un resultado sin tareas no la toca.
  expect(roadmapFrom(`${MCP}change_transition`, {}, JSON.stringify({ slug: 'csv', status: 'done' }))).toBeNull()
  expect(roadmapFrom(`${MCP}issue_list`, {}, '[]')).toBeUndefined()
  expect(roadmapFrom(`${MCP}change_get`, {}, 'no es json')).toBeUndefined()
})

test('barText muestra el progreso, la siguiente tarea acortada y las preguntas', () => {
  expect(barText({ slug: 'csv', status: 'approved', done: 1, total: 3, next: 'T2 Endpoint de descarga: GET /pedidos.csv con filtros', questions: 0 })).toBe(
    'seckert · csv · 1/3 · sigue: T2 Endpoint de descarga',
  )
  expect(barText({ slug: 'csv', status: 'approved', done: 3, total: 3, next: null, questions: 0 })).toBe('seckert · csv · 3/3 · listo para verificar')
  expect(barText({ slug: 'csv', status: 'proposed', done: 0, total: 3, next: 'T1 x', questions: 0 })).toBe('seckert · csv · 3 tareas · esperando tu "sí"')
  expect(barText({ slug: 'csv', status: 'proposed', done: 0, total: 3, next: 'T1 x', questions: 2 })).toBe('seckert · csv · 3 tareas · 2 preguntas abiertas')
})

test('sin llamadas a las herramientas de change no hay barra', async ($, on) => {
  engine(on, {})
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  expect(await bar($)).toBeNull()
})

test('la barra aparece con change_get y avanza con task_complete', async ($, on) => {
  engine(on, {
    [`${MCP}change_get`]: { slug: 'csv', status: 'approved', tasks: TASKS, questions: [] },
    [`${MCP}task_complete`]: { slug: 'csv', status: 'approved', tasks: TASKS.map(t => (t.id === 'T2' ? { ...t, done: true } : t)), questions: 0 },
    [`${MCP}change_transition`]: { slug: 'csv', status: 'done' },
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  await $.tool.call({ tool: `${MCP}change_get`, slug: 'csv' })
  expect(await bar($)).toContain('csv · 1/3 · sigue: T2')

  await $.tool.call({ tool: `${MCP}task_complete`, slug: 'csv', task: 'T2', commit: 'abc1234', evidencia: 'ok' })
  expect(await bar($)).toContain('csv · 2/3 · sigue: T3 Botón Exportar')

  await $.prompt.submit({ text: 'cerralo', wait: false, origin: { kind: 'composer' } })
  await $.tool.call({ tool: `${MCP}change_transition`, slug: 'csv', to: 'done', aprobacion: 'cerralo' })
  expect(await bar($)).toBeNull()
})
