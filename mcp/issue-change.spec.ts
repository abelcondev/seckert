// Un change que vive en su issue: con `seckert issues: github` en AGENTS.md, las
// herramientas del change leen y escriben el issue y su artifact plan (gh falso).
import { afterAll, beforeAll, beforeEach, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const SERVER = resolve(import.meta.dir, 'dist/server.mjs')
const FAKE = resolve(import.meta.dir, 'fake-gh.mjs')

let dir: string
let repo: string
let state: string
let client: Client

type Db = { issues: Record<string, any>[]; calls: string[][]; artifactsUnavailable?: boolean }
const db = (): Db => JSON.parse(readFileSync(state, 'utf8'))
const git = (...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: repo, encoding: 'utf8' }).trim()

async function call(name: string, args: Record<string, unknown>) {
  const result = (await client.callTool({ name, arguments: args })) as { isError?: boolean; content: { text: string }[] }
  const text = result.content[0]!.text
  return { error: result.isError ? text : null, value: result.isError ? null : JSON.parse(text) }
}

const ISSUE = {
  title: 'Exportar pedidos a CSV',
  problem: 'El contador copia los pedidos a mano.',
  outcome: 'Los pedidos del mes se bajan en un archivo.',
  criteria: ['Hay un botón "Exportar"', 'El CSV trae fecha y total'],
  route: 'CHANGE',
  kind: 'feature',
}

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'seckert-mcp-ic-'))
  repo = join(dir, 'repo')
  mkdirSync(repo)
  execFileSync('git', ['init', '-q', '-b', 'main', repo])
  execFileSync('git', ['remote', 'add', 'origin', 'git@github.com:acme/tienda.git'], { cwd: repo })
  writeFileSync(join(repo, 'AGENTS.md'), '# tienda\n\n- seckert issues: github\n')
  git('add', '-A')
  git('commit', '-q', '-m', 'init')
  const bin = join(dir, 'bin')
  mkdirSync(bin)
  writeFileSync(join(bin, 'gh'), `#!/bin/sh\nexec node "${FAKE}" "$@"\n`)
  chmodSync(join(bin, 'gh'), 0o755)
  state = join(dir, 'gh.json')
  client = new Client({ name: 'test', version: '0.0.0' })
  const env = { ...(process.env as Record<string, string>), PATH: `${bin}:${process.env.PATH}`, FAKE_GH_STATE: state }
  await client.connect(new StdioClientTransport({ command: 'node', args: [SERVER], env, cwd: repo }))
})

beforeEach(() => {
  writeFileSync(state, JSON.stringify({ issues: [], calls: [] }))
  git('switch', '-q', 'main')
  for (const b of git('branch', '--format=%(refname:short)').split('\n')) if (b && b !== 'main') git('branch', '-q', '-D', b)
})

afterAll(async () => {
  await client?.close()
  rmSync(dir, { recursive: true, force: true })
})

async function takenChange() {
  await call('issue_create', ISSUE)
  await call('issue_transition', { id: '1', to: 'approved', aprobacion: 'dale' })
  await call('issue_take', { id: '1' })
  return call('change_create', { slug: 'exportar-pedidos-a-csv', title: ISSUE.title, tasks: ['Armar el CSV', 'Botón en la lista'], pedido: 'exportar pedidos', issue: '1' })
}

const plan = () => db().issues[0]!.artifacts.find((a: { name: string }) => a.name === 'Plan')

test('change_create con issue escribe el plan como artifact, sin archivo en sdd/changes', async () => {
  const { value, error } = await takenChange()
  expect(error).toBeNull()
  expect(value).toMatchObject({ slug: 'exportar-pedidos-a-csv', status: 'proposed', file: 'issue #1' })
  expect(existsSync(join(repo, 'sdd/changes'))).toBe(false)
  expect(plan()).toMatchObject({ type: 'plan', name: 'Plan' })
  expect(plan().body).toContain('<!-- seckert:plan\nstatus: proposed')
  expect(plan().body).not.toContain('## Why')
  expect(db().issues[0]!.labels).toContain('seckert:change')
})

test('change_get arma el change desde el issue: el What son los criterios', async () => {
  await takenChange()
  const { value } = await call('change_get', { slug: 'exportar-pedidos-a-csv' })
  expect(value).toMatchObject({ status: 'proposed', issue: '1', branch: 'feature/exportar-pedidos-a-csv', what: ISSUE.criteria })
  expect(value.tasks.map((t: { id: string }) => t.id)).toEqual(['T1', 'T2'])
  expect((await call('change_list', {})).value.map((c: { slug: string }) => c.slug)).toContain('exportar-pedidos-a-csv')
})

test('aprobar, marcar una tarea y editar el What escriben en el issue: plan versionado, casilla con commit y comentarios', async () => {
  await takenChange()
  expect((await call('change_transition', { slug: 'exportar-pedidos-a-csv', to: 'approved', aprobacion: 'dale' })).error).toBeNull()
  expect(plan().body).toContain('status: approved')
  expect(db().issues[0]!.comments.at(-1)).toContain('aprobado ("dale")')

  writeFileSync(join(repo, 'csv.ts'), 'x\n')
  git('add', '-A')
  git('commit', '-q', '-m', 'feat: csv')
  const hash = git('rev-parse', '--short=7', 'HEAD')
  expect((await call('task_complete', { slug: 'exportar-pedidos-a-csv', task: 'T1', commit: hash, evidencia: 'test del CSV pasa' })).error).toBeNull()
  expect(plan().body).toContain(`- [x] T1 Armar el CSV · \`${hash}\` <!-- commit: ${hash} -->`)
  expect(plan().versions.length).toBe(3)
  expect(db().issues[0]!.comments.at(-1)).toContain(`T1 hecha (${hash})`)

  expect((await call('change_update', { slug: 'exportar-pedidos-a-csv', ops: [{ op: 'what_add', text: 'El archivo se llama pedidos-AAAA-MM.csv' }] })).error).toBeNull()
  const issue = (await call('issue_get', { id: '1' })).value
  expect(issue.criteria).toEqual([...ISSUE.criteria, 'El archivo se llama pedidos-AAAA-MM.csv'])
  expect(existsSync(join(repo, 'sdd/changes'))).toBe(false)
})

test('sin la API de artifacts, el plan va en ## Plan del body y el issue se sigue leyendo', async () => {
  await call('issue_create', ISSUE)
  const data = db()
  data.artifactsUnavailable = true
  writeFileSync(state, JSON.stringify(data))
  await call('issue_transition', { id: '1', to: 'approved', aprobacion: 'dale' })
  await call('issue_take', { id: '1' })
  const created = await call('change_create', { slug: 'exportar-pedidos-a-csv', title: ISSUE.title, tasks: ['Armar el CSV'], pedido: 'x', issue: '1' })
  expect(created.error).toBeNull()
  expect(db().issues[0]!.body).toContain('\n## Plan\n\n<!-- seckert:plan\n')
  expect((await call('change_transition', { slug: 'exportar-pedidos-a-csv', to: 'approved', aprobacion: 'dale' })).error).toBeNull()
  expect(db().issues[0]!.body).toContain('status: approved')
  expect((await call('issue_get', { id: '1' })).value.criteria).toEqual(ISSUE.criteria)
})

test('sin la línea en AGENTS.md, un change con issue sigue siendo un archivo', async () => {
  writeFileSync(join(repo, 'AGENTS.md'), '# tienda\n')
  try {
    await call('issue_create', ISSUE)
    const { value } = await call('change_create', { slug: 'csv-archivo', title: 'x', why: 'x', what: ['x'], tasks: ['x'], pedido: 'x', issue: '1' })
    expect(value.file).toMatch(/^sdd\/changes\/.*-csv-archivo\.md$/)
    expect(db().issues[0]!.artifacts ?? []).toEqual([])
  } finally {
    writeFileSync(join(repo, 'AGENTS.md'), '# tienda\n\n- seckert issues: github\n')
    rmSync(join(repo, 'sdd'), { recursive: true, force: true })
  }
})
