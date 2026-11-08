// change_update y spec_write contra un repo git real; el change vive en su issue (gh falso).
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { fixture, type Fixture } from './fixture'

const TODAY = new Date().toLocaleDateString('sv-SE', { timeZone: 'UTC' })

const CHANGE = `---
status: approved
specs: []
design: none
branch: feature/csv
---

# csv

## Why

x

## What

- Exporta los pedidos a CSV.

## Open questions

- **P1** ¿Con qué separador?

## Tasks

- [ ] T1 Primera <!-- commit: -->
- [ ] T2 Segunda <!-- commit: -->

## Log

- **L1** (pedido original, verbatim): x
`

let fx: Fixture
let repo: string
const git = (...args: string[]) => fx.git(...args)
// Sin ruta: el change csv. Con ruta: un archivo del repo (sdd/specs).
const read = (path?: string) => (path ? readFileSync(join(repo, path), 'utf8') : fx.changeText('csv'))
const call = (name: string, args: Record<string, unknown>) => fx.call(name, args)
const body = (result: { content: { text: string }[] }) => JSON.parse(result.content[0]!.text)

beforeAll(async () => {
  fx = await fixture('seckert-mcp-u-')
  repo = fx.repo
  fx.seedChange(CHANGE)
})

afterAll(async () => {
  await fx?.close()
})

test('change_update responde una pregunta y agrega una tarea en una llamada, y devuelve los números nuevos', async () => {
  const result = await call('change_update', {
    slug: 'csv',
    ops: [
      { op: 'question_answer', id: 'P1', log: 'punto y coma ("con ;")' },
      { op: 'what_add', text: 'El separador es punto y coma.' },
      { op: 'task_add', text: 'Tercera' },
    ],
  })
  expect(result.isError).toBeUndefined()
  expect(body(result).ids).toEqual(['T3'])
  const text = read()
  expect(text).not.toContain('**P1**')
  expect(text).toContain('- El separador es punto y coma.')
  expect(text).toContain('- [ ] T3 Tercera <!-- commit: -->')
  expect(text).toContain('- **L2** P1: punto y coma ("con ;")')
})

test('change_update con una operación inválida no escribe nada', async () => {
  const before = read()
  const result = await call('change_update', { slug: 'csv', ops: [{ op: 'log', text: 'x' }, { op: 'task_reopen', id: 'T9', log: 'x' }] })
  expect(result.isError).toBe(true)
  expect(result.content[0]!.text).toContain('T9')
  expect(read()).toBe(before)
})

test('change_update no toca el status ni marca tareas', async () => {
  const result = await call('change_update', { slug: 'csv', ops: [{ op: 'status', to: 'done' }] })
  expect(result.isError).toBe(true)
  expect(read()).toContain('status: approved')
})

test('change_update con resync_commits actualiza los hashes tras un rebase', async () => {
  git('switch', '-q', '-c', 'feature/csv')
  writeFileSync(join(repo, 'a.txt'), 'a\n')
  git('add', 'a.txt')
  git('commit', '-q', '-m', 'feat: primera')
  const old = git('rev-parse', '--short=7', 'HEAD')
  await call('task_complete', { slug: 'csv', task: 'T1', commit: old, evidencia: 'ok' })
  // main avanza y la rama se rebasa: el commit de T1 cambia de hash.
  git('switch', '-q', 'main')
  writeFileSync(join(repo, 'b.txt'), 'b\n')
  git('add', 'b.txt')
  git('commit', '-q', '-m', 'chore: b')
  git('switch', '-q', 'feature/csv')
  git('rebase', '-q', 'main')
  const moved = git('log', '--format=%h', '--abbrev=7', '-1', '--grep=^feat: primera$')

  const result = await call('change_update', { slug: 'csv', resync_commits: true })
  expect(result.isError).toBeUndefined()
  expect(body(result).resync).toEqual({ changed: ['T1'], missing: [] })
  expect(read()).toContain(`- [x] T1 Primera <!-- commit: ${moved} -->`)
  expect(read()).toContain(`- ${TODAY}: hashes actualizados tras un rebase: T1 ${old} → ${moved}.`)
})

test('spec_write crea el área, cambia una regla y la quita', async () => {
  const created = await call('spec_write', { area: 'pedidos', title: 'Envío gratis', body: 'Desde $50.' })
  expect(created.isError).toBeUndefined()
  expect(read('sdd/specs/pedidos.md')).toBe('# Pedidos\n\n## Envío gratis\n\nDesde $50.\n')

  await call('spec_write', { area: 'pedidos', title: 'Envío gratis', body: 'Desde $60.' })
  await call('spec_write', { area: 'pedidos', title: 'Cupones', body: 'Uno por pedido.' })
  expect(read('sdd/specs/pedidos.md')).toBe('# Pedidos\n\n## Envío gratis\n\nDesde $60.\n\n## Cupones\n\nUno por pedido.\n')

  await call('spec_write', { area: 'pedidos', title: 'Envío gratis', remove: true })
  expect(read('sdd/specs/pedidos.md')).toBe('# Pedidos\n\n## Cupones\n\nUno por pedido.\n')
})

test('spec_write rechaza un área que no es kebab-case', async () => {
  const result = await call('spec_write', { area: '../x', title: 'a', body: 'b' })
  expect(result.isError).toBe(true)
  expect(existsSync(join(repo, 'x.md'))).toBe(false)
})
