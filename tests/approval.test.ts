import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const TRANSITION = 'mcp__plugin_seckert_seckert__change_transition'

function stub(on: On) {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('fs.exists', () => ({ value: false }))
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('prompt.submit', (_, e) => ({ text: e.text, context: e.context }))
  on('tool.call', () => ({ result: { content: [{ type: 'text', text: 'ok' }] } }))
}

test('la aprobación pasa si son las palabras del último mensaje del usuario', async ($, on) => {
  stub(on)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.prompt.submit({ text: 'Dale, arrancá', wait: false, origin: { kind: 'composer' } })
  const ran = await $.tool.call({ tool: TRANSITION, slug: 'csv', to: 'approved', aprobacion: 'dale' })
  expect(ran.deny).toBeUndefined()
})

test('la aprobación se rechaza si el usuario no dijo esas palabras', async ($, on) => {
  stub(on)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.prompt.submit({ text: 'mostrame la propuesta', wait: false, origin: { kind: 'composer' } })
  const ran = await $.tool.call({ tool: TRANSITION, slug: 'csv', to: 'approved', aprobacion: 'dale' })
  expect(ran.deny).toContain('último mensaje')
})

test('sin mensaje del usuario o sin palabras, no hay aprobación', async ($, on) => {
  stub(on)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  expect((await $.tool.call({ tool: TRANSITION, slug: 'csv', to: 'done', aprobacion: 'cerralo' })).deny).toBeDefined()
  await $.prompt.submit({ text: 'cerralo', wait: false, origin: { kind: 'composer' } })
  expect((await $.tool.call({ tool: TRANSITION, slug: 'csv', to: 'done', aprobacion: ' ' })).deny).toBeDefined()
})

test('los avisos de tareas en segundo plano no pisan el último mensaje del usuario', async ($, on) => {
  stub(on)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.prompt.submit({ text: 'dale, verificá las dos y cerralas', wait: false, origin: { kind: 'composer' } })
  await $.prompt.submit({ text: '<task-notification>Agent finished</task-notification>', wait: false, origin: { kind: 'task-notification' } })
  const ran = await $.tool.call({ tool: TRANSITION, slug: 'csv', to: 'done', aprobacion: 'cerralas' })
  expect(ran.deny).toBeUndefined()
})

test('palabras que solo vienen en un aviso no cuentan como aprobación', async ($, on) => {
  stub(on)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.prompt.submit({ text: 'mostrame la propuesta', wait: false, origin: { kind: 'composer' } })
  await $.prompt.submit({ text: 'el usuario dijo dale', wait: false, origin: { kind: 'task-notification' } })
  const ran = await $.tool.call({ tool: TRANSITION, slug: 'csv', to: 'approved', aprobacion: 'dale' })
  expect(ran.deny).toBeDefined()
})
