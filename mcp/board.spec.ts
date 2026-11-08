// El tablero del repo (GitHub Projects) sigue el estado de los issues de seckert (gh falso).
import { afterAll, beforeAll, beforeEach, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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

const db = () => JSON.parse(readFileSync(state, 'utf8'))
const git = (...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: repo, encoding: 'utf8' }).trim()

async function call(name: string, args: Record<string, unknown>) {
  const result = (await client.callTool({ name, arguments: args })) as { isError?: boolean; content: { text: string }[] }
  const text = result.content[0]!.text
  return { error: result.isError ? text : null, value: result.isError ? null : JSON.parse(text) }
}

const STATUS = ['Draft', 'Approved', 'In Progress', 'In Review', 'Done']
export const BOARD = {
  id: 'PVT_1',
  number: 7,
  title: 'tienda',
  fields: [
    { id: 'F_status', name: 'Status', type: 'ProjectV2SingleSelectField', options: STATUS.map((name, i) => ({ id: `s${i}`, name })) },
    { id: 'F_priority', name: 'Priority', type: 'ProjectV2SingleSelectField', options: ['Urgent', 'High', 'Medium', 'Low'].map((name, i) => ({ id: `p${i}`, name })) },
    { id: 'F_size', name: 'Size', type: 'ProjectV2SingleSelectField', options: ['XS', 'S', 'M', 'L', 'XL'].map((name, i) => ({ id: `z${i}`, name })) },
    { id: 'F_cycle', name: 'Cycle', type: 'ProjectV2IterationField' },
  ],
  items: [] as { id: string; url: string; values: Record<string, string>; archived: boolean }[],
  iterations: [
    { id: 'it1', title: 'Cycle 1', startDate: '2026-11-02', duration: 14 },
    { id: 'it2', title: 'Cycle 2', startDate: '2026-11-16', duration: 14 },
  ],
}

const ISSUE = { title: 'Exportar pedidos', problem: 'Se copian a mano.', outcome: 'Se bajan en un CSV.', criteria: ['Hay un botón'], route: 'FIX' }

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'seckert-mcp-board-'))
  repo = join(dir, 'repo')
  mkdirSync(repo)
  execFileSync('git', ['init', '-q', '-b', 'main', repo])
  execFileSync('git', ['remote', 'add', 'origin', 'git@github.com:acme/tienda.git'], { cwd: repo })
  writeFileSync(join(repo, 'README.md'), 'x\n')
  git('add', '-A')
  git('commit', '-q', '-m', 'init')
  const bin = join(dir, 'bin')
  mkdirSync(bin)
  writeFileSync(join(bin, 'gh'), `#!/bin/sh\nexec node "${FAKE}" "$@"\n`)
  chmodSync(join(bin, 'gh'), 0o755)
  state = join(dir, 'gh.json')
  client = new Client({ name: 'test', version: '0.0.0' })
  const env = { ...(process.env as Record<string, string>), PATH: `${bin}:${process.env.PATH}`, FAKE_GH_STATE: state, SECKERT_TODAY: '2026-11-09' }
  await client.connect(new StdioClientTransport({ command: 'node', args: [SERVER], env, cwd: repo }))
})

beforeEach(() => {
  writeFileSync(state, JSON.stringify({ issues: [], calls: [], board: structuredClone(BOARD) }))
  git('switch', '-q', 'main')
  for (const b of git('branch', '--format=%(refname:short)').split('\n')) if (b && b !== 'main') git('branch', '-q', '-D', b)
})

afterAll(async () => {
  await client?.close()
  rmSync(dir, { recursive: true, force: true })
})

const statusOf = (n: number) => {
  const item = db().board.items.find((i: { url: string }) => i.url.endsWith(`/issues/${n}`))
  return item ? STATUS[Number(item.values.F_status?.slice(1))] ?? null : undefined
}

test('crear, aprobar y tomar un issue lo mueven en el tablero: Draft, Approved, In Progress', async () => {
  await call('issue_create', ISSUE)
  expect(statusOf(1)).toBe('Draft')
  await call('issue_transition', { id: '1', to: 'approved', aprobacion: 'dale' })
  expect(statusOf(1)).toBe('Approved')
  await call('issue_take', { id: '1' })
  expect(statusOf(1)).toBe('In Progress')
})

test('board_sync pone In Review con un PR abierto y Done al cerrarse; descartar lo archiva', async () => {
  await call('issue_create', ISSUE)
  await call('issue_create', { ...ISSUE, title: 'Otro' })
  await call('issue_transition', { id: '1', to: 'approved', aprobacion: 'dale' })
  const data = db()
  data.issues[0].prs = [{ number: 9 }]
  writeFileSync(state, JSON.stringify(data))
  const { value } = await call('board_sync', {})
  expect(value).toMatchObject({ board: 7, updated: [{ id: '1', status: 'In Review' }] })
  expect(statusOf(1)).toBe('In Review')

  const closed = db()
  closed.issues[0].state = 'CLOSED'
  closed.issues[0].stateReason = 'COMPLETED'
  writeFileSync(state, JSON.stringify(closed))
  await call('board_sync', { ids: ['1'] })
  expect(statusOf(1)).toBe('Done')

  await call('issue_transition', { id: '2', to: 'discarded', motivo: 'no va' })
  expect(db().board.items.find((i: { url: string }) => i.url.endsWith('/issues/2')).archived).toBe(true)
})

test('sin un Project enlazado al repo, los issues funcionan igual y no se toca Projects', async () => {
  writeFileSync(state, JSON.stringify({ issues: [], calls: [] }))
  expect((await call('issue_create', ISSUE)).error).toBeNull()
  expect(db().calls.some((c: string[]) => c[0] === 'project')).toBe(false)
  expect((await call('board_sync', {})).value).toMatchObject({ board: null })
})

test('si el tablero falla, la operación del issue no falla: avisa', async () => {
  const data = db()
  data.board.fields = data.board.fields.filter((f: { name: string }) => f.name !== 'Status')
  writeFileSync(state, JSON.stringify(data))
  const { value, error } = await call('issue_create', ISSUE)
  expect(error).toBeNull()
  expect(value.board).toContain('Status')
})

test('board_setup crea o completa el tablero del repo', async () => {
  writeFileSync(state, JSON.stringify({ issues: [], calls: [] }))
  const { error } = await call('board_setup', {})
  // el gh falso no implementa project create: lo que importa es que la herramienta existe y llama a gh
  expect(error ?? '').not.toContain('Unknown tool')
  expect(db().calls.some((c: string[]) => c.join(' ').includes('project create'))).toBe(true)
})

const valuesOf = (n: number) => db().board.items.find((i: { url: string }) => i.url.endsWith(`/issues/${n}`))?.values ?? {}

test('issue_create e issue_plan ponen prioridad, tamaño y cycle en el tablero', async () => {
  const { error } = await call('issue_create', { ...ISSUE, priority: 'High', size: 'M', cycle: 'current' })
  expect(error).toBeNull()
  // hoy (2026-11-09 según el reloj del test) cae en Cycle 1
  expect(valuesOf(1)).toMatchObject({ F_priority: 'p1', F_size: 'z2', F_cycle: 'it1' })

  const plan = await call('issue_plan', { id: '1', priority: 'Urgent', cycle: 'next' })
  expect(plan.error).toBeNull()
  expect(plan.value).toMatchObject({ id: '1', priority: 'Urgent', cycle: 'Cycle 2' })
  expect(valuesOf(1)).toMatchObject({ F_priority: 'p0', F_size: 'z2', F_cycle: 'it2' })

  await call('issue_plan', { id: '1', cycle: 'none' })
  expect(valuesOf(1).F_cycle).toBeUndefined()
})

test('issue_plan sin tablero o con un valor que no existe falla diciendo por qué', async () => {
  await call('issue_create', ISSUE)
  expect((await call('issue_plan', { id: '1', cycle: 'Cycle 9' })).error).toContain('Cycle 9')
  writeFileSync(state, JSON.stringify({ ...db(), board: undefined }))
  expect((await call('issue_plan', { id: '1', priority: 'High' })).error).toContain('board_setup')
})

test('board_list muestra el cycle actual ordenado por prioridad', async () => {
  await call('issue_create', { ...ISSUE, title: 'Baja', priority: 'Low', cycle: 'current' })
  await call('issue_create', { ...ISSUE, title: 'Urgente', priority: 'Urgent', size: 'S', cycle: 'current' })
  await call('issue_create', { ...ISSUE, title: 'Próximo', priority: 'High', cycle: 'next' })
  await call('issue_create', { ...ISSUE, title: 'Sin cycle' })
  const { value } = await call('board_list', {})
  expect(value.cycle).toBe('Cycle 1')
  expect(value.items.map((i: { title: string }) => i.title)).toEqual(['Urgente', 'Baja'])
  expect(value.items[0]).toMatchObject({ id: '2', status: 'Draft', priority: 'Urgent', size: 'S', cycle: 'Cycle 1' })
  expect((await call('board_list', { cycle: 'next' })).value.items.map((i: { title: string }) => i.title)).toEqual(['Próximo'])
  expect((await call('board_list', { cycle: 'all' })).value.items.map((i: { title: string }) => i.title)).toEqual(['Urgente', 'Próximo', 'Baja', 'Sin cycle'])
})
