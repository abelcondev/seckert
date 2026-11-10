// change_transition y task_complete contra un repo git real; el change vive en su issue (gh falso).
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { fixture, type Fixture } from './fixture'

const TODAY = new Date().toLocaleDateString('sv-SE', { timeZone: 'UTC' })

const change = (slug: string, status: string, questions = '') => `---
status: ${status}
specs: []
design: none
branch: feature/${slug}
---

# ${slug}

## Why

x

## What

- Hace algo.

## Open questions

${questions}
## Tasks

- [ ] T1 Primera <!-- commit: -->
- [ ] T2 Segunda <!-- commit: -->

## Log

- **L1** (pedido original, verbatim): x
`

let fx: Fixture
const git = (...args: string[]) => fx.git(...args)
const read = (slug: string) => fx.changeText(slug)
const call = (name: string, args: Record<string, unknown>) => fx.call(name, args)

beforeAll(async () => {
  fx = await fixture('seckert-mcp-t-', (_, g) => g('commit', '-q', '--allow-empty', '-m', 'base'))
  git('branch', 'develop')
  fx.seedChange(change('csv', 'proposed'))
  fx.seedChange(change('dudas', 'proposed', '- **P1** ¿Con qué separador?\n'))
})

afterAll(async () => {
  await fx?.close()
})

test('aprobar exige las palabras del usuario', async () => {
  const result = await call('change_transition', { slug: 'csv', to: 'approved' })
  expect(result.isError).toBe(true)
  expect(read('csv')).toContain('status: proposed')
})

test('no se salta de proposed a done', async () => {
  const result = await call('change_transition', { slug: 'csv', to: 'done', aprobacion: 'cerralo' })
  expect(result.isError).toBe(true)
  expect(result.content[0]!.text).toContain('proposed')
})

test('con preguntas abiertas no aprueba salvo que el usuario siga igual, y entonces las anota como pendientes', async () => {
  const blocked = await call('change_transition', { slug: 'dudas', to: 'approved', aprobacion: 'dale' })
  expect(blocked.isError).toBe(true)
  expect(blocked.content[0]!.text).toContain('P1')

  const ok = await call('change_transition', { slug: 'dudas', to: 'approved', aprobacion: 'sí, seguí igual', pendientes: true })
  expect(ok.isError).toBeUndefined()
  expect(read('dudas')).toContain('pendientes al aprobar: P1')
  git('switch', '-q', 'main')
})

test('aprobar pasa a approved, crea feature/<slug> desde la base detectada y lo anota en el Log', async () => {
  const result = await call('change_transition', { slug: 'csv', to: 'approved', aprobacion: 'dale' })
  expect(result.isError).toBeUndefined()
  expect(git('rev-parse', '--abbrev-ref', 'HEAD')).toBe('feature/csv')
  expect(git('merge-base', 'HEAD', 'develop')).toBe(git('rev-parse', 'develop'))
  const text = read('csv')
  expect(text).toContain('status: approved')
  expect(text).toContain(`- ${TODAY}: aprobado ("dale"). Rama feature/csv desde develop.`)
  expect(JSON.parse(result.content[0]!.text)).toMatchObject({ status: 'approved', next: 'T1', done: 0, total: 2 })
})

test('task_complete exige un commit que exista en la rama', async () => {
  const missing = await call('task_complete', { slug: 'csv', task: 'T1', commit: 'deadbee', evidencia: 'x' })
  expect(missing.isError).toBe(true)
  expect(read('csv')).toContain('- [ ] T1 Primera')
})

test('task_complete marca la tarea con el hash corto y anota la evidencia', async () => {
  writeFileSync(join(fx.repo, 'a.txt'), 'a\n')
  git('add', 'a.txt')
  git('commit', '-q', '-m', 'feat: a')
  const hash = git('rev-parse', '--short=7', 'HEAD')

  const result = await call('task_complete', { slug: 'csv', task: 'T1', commit: git('rev-parse', 'HEAD'), evidencia: '`bun test` 3 pass' })
  expect(result.isError).toBeUndefined()
  const text = read('csv')
  expect(text).toContain(`- [x] T1 Primera <!-- commit: ${hash} -->`)
  expect(text).toContain(`- ${TODAY}: T1 hecha (${hash}). \`bun test\` 3 pass`)
  // El progreso del plan, para el roadmap de la respuesta y la barra.
  const out = JSON.parse(result.content[0]!.text)
  expect(out).toMatchObject({ status: 'approved', done: 1, total: 2, next: 'T2 Segunda' })
  expect(out.tasks).toEqual([
    { id: 'T1', text: 'Primera', done: true },
    { id: 'T2', text: 'Segunda', done: false },
  ])
})

test('cerrar con tareas pendientes exige confirmarlo y anota lo que quedó fuera', async () => {
  const blocked = await call('change_transition', { slug: 'csv', to: 'done', aprobacion: 'cerralo' })
  expect(blocked.isError).toBe(true)
  expect(blocked.content[0]!.text).toContain('T2')

  const ok = await call('change_transition', { slug: 'csv', to: 'done', aprobacion: 'cerralo igual', pendientes: true })
  expect(ok.isError).toBeUndefined()
  const text = read('csv')
  expect(text).toContain('status: done')
  expect(text).toContain(`- ${TODAY}: cerrado ("cerralo igual"). Quedó fuera: T2.`)
})
