// change_transition y task_complete contra un repo git real.
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const SERVER = resolve(import.meta.dir, 'dist/server.mjs')
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

let repo: string
let client: Client

const git = (...args: string[]) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim()
const read = (slug: string) => readFileSync(join(repo, `sdd/changes/2026-11-01-${slug}.md`), 'utf8')

type Result = { isError?: boolean; content: { text: string }[] }
const call = async (name: string, args: Record<string, unknown>) =>
  (await client.callTool({ name, arguments: args })) as Result

beforeAll(async () => {
  repo = mkdtempSync(join(tmpdir(), 'seckert-mcp-t-'))
  git('init', '-q', '-b', 'main')
  git('config', 'user.email', 't@t')
  git('config', 'user.name', 't')
  writeFileSync(join(repo, 'README.md'), 'x\n')
  git('add', '.')
  git('commit', '-q', '-m', 'init')
  git('branch', 'develop')
  mkdirSync(join(repo, 'sdd/changes'), { recursive: true })
  writeFileSync(join(repo, 'sdd/changes/2026-11-01-csv.md'), change('csv', 'proposed'))
  writeFileSync(join(repo, 'sdd/changes/2026-11-01-dudas.md'), change('dudas', 'proposed', '- **P1** ¿Con qué separador?\n'))

  client = new Client({ name: 'test', version: '0.0.0' })
  await client.connect(new StdioClientTransport({ command: 'node', args: [SERVER], env: { ...(process.env as Record<string, string>), TZ: 'UTC' }, cwd: repo }))
})

afterAll(async () => {
  await client?.close()
  rmSync(repo, { recursive: true, force: true })
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
})

test('task_complete exige un commit que exista en la rama', async () => {
  const missing = await call('task_complete', { slug: 'csv', task: 'T1', commit: 'deadbee', evidencia: 'x' })
  expect(missing.isError).toBe(true)
  expect(read('csv')).toContain('- [ ] T1 Primera')
})

test('task_complete marca la tarea con el hash corto y anota la evidencia', async () => {
  writeFileSync(join(repo, 'a.txt'), 'a\n')
  git('add', 'a.txt')
  git('commit', '-q', '-m', 'feat: a')
  const hash = git('rev-parse', '--short=7', 'HEAD')

  const result = await call('task_complete', { slug: 'csv', task: 'T1', commit: git('rev-parse', 'HEAD'), evidencia: '`bun test` 3 pass' })
  expect(result.isError).toBeUndefined()
  const text = read('csv')
  expect(text).toContain(`- [x] T1 Primera <!-- commit: ${hash} -->`)
  expect(text).toContain(`- ${TODAY}: T1 hecha (${hash}). \`bun test\` 3 pass`)
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
