// Las herramientas de issues en el servidor compilado, con un `gh` falso en el
// PATH que guarda los issues en un JSON (mcp/fake-gh.mjs).
import { afterAll, beforeAll, beforeEach, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

import { parseRemote } from './issues'

const SERVER = resolve(import.meta.dir, 'dist/server.mjs')
const FAKE = resolve(import.meta.dir, 'fake-gh.mjs')

let dir: string
let repo: string
let state: string
let client: Client

type Db = { issues: Record<string, any>[]; calls: string[][] }
const db = (): Db => JSON.parse(readFileSync(state, 'utf8'))
const reset = (issues: Db['issues'] = []) => writeFileSync(state, JSON.stringify({ issues, calls: [] }))

async function call(name: string, args: Record<string, unknown>) {
  const result = (await client.callTool({ name, arguments: args })) as { isError?: boolean; content: { text: string }[] }
  const text = result.content[0]!.text
  return { error: result.isError ? text : null, value: result.isError ? null : JSON.parse(text) }
}

const ISSUE = {
  title: 'Exportar pedidos a CSV',
  context: 'El cliente quiere bajar los pedidos del mes.',
  quote: 'Necesito un botón que me baje todo en Excel.',
  criteria: ['Hay un botón "Exportar"', 'El CSV trae fecha y total'],
  route: 'CHANGE',
  origin: { client: 'Acme', date: '2026-11-06' },
}

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'seckert-mcp-i-'))
  repo = join(dir, 'repo')
  mkdirSync(join(repo, 'src'), { recursive: true })
  execFileSync('git', ['init', '-q', '-b', 'main', repo])
  execFileSync('git', ['remote', 'add', 'origin', 'git@github.com:acme/tienda.git'], { cwd: repo })
  const bin = join(dir, 'bin')
  mkdirSync(bin)
  writeFileSync(join(bin, 'gh'), `#!/bin/sh\nexec node "${FAKE}" "$@"\n`)
  chmodSync(join(bin, 'gh'), 0o755)
  state = join(dir, 'gh.json')
  reset()
  client = new Client({ name: 'test', version: '0.0.0' })
  const env = { ...(process.env as Record<string, string>), PATH: `${bin}:${process.env.PATH}`, FAKE_GH_STATE: state }
  await client.connect(new StdioClientTransport({ command: 'node', args: [SERVER], env, cwd: join(repo, 'src') }))
})

beforeEach(() => reset())

afterAll(async () => {
  await client?.close()
  rmSync(dir, { recursive: true, force: true })
})

test('el repo sale de origin, por ssh o https', () => {
  expect(parseRemote('git@github.com:acme/tienda.git')).toBe('acme/tienda')
  expect(parseRemote('https://github.com/acme/tienda.git\n')).toBe('acme/tienda')
  expect(parseRemote('https://github.com/acme/tienda')).toBe('acme/tienda')
  expect(parseRemote('git@gitlab.com:acme/tienda.git')).toBeNull()
})

test('expone las cuatro herramientas; get y list son solo lectura', async () => {
  const { tools } = await client.listTools()
  const byName = Object.fromEntries(tools.map(tool => [tool.name, tool]))
  expect(Object.keys(byName)).toEqual(expect.arrayContaining(['issue_create', 'issue_get', 'issue_list', 'issue_transition']))
  expect(byName.issue_get?.annotations?.readOnlyHint).toBe(true)
  expect(byName.issue_list?.annotations?.readOnlyHint).toBe(true)
})

test('issue_create lo crea en draft en el repo de origin, con el cuerpo de seckert', async () => {
  const { value } = await call('issue_create', ISSUE)
  expect(value).toMatchObject({ id: '1', state: 'draft', title: ISSUE.title, quote: ISSUE.quote, url: 'https://github.com/acme/tienda/issues/1' })
  const saved = db().issues[0]!
  expect(saved.labels).toEqual(['seckert:draft'])
  expect(saved.body).toContain('## Acceptance criteria')
  expect(db().calls.find(c => c[1] === 'create')).toContain('acme/tienda')
})

test('aprobar exige las palabras del usuario y las deja en un comentario', async () => {
  await call('issue_create', ISSUE)
  const without = await call('issue_transition', { id: '1', to: 'approved' })
  expect(without.error).toContain('palabras')
  expect(db().issues[0]!.labels).toEqual(['seckert:draft'])

  const { value } = await call('issue_transition', { id: '1', to: 'approved', aprobacion: '1 y 3 dale' })
  expect(value).toMatchObject({ id: '1', from: 'draft', to: 'approved' })
  expect(db().issues[0]!.labels).toEqual(['seckert:approved'])
  expect(db().issues[0]!.comments).toEqual(['Aprobado por el usuario: «1 y 3 dale»'])
})

test('descartar cierra el issue como no planeado y deja el motivo', async () => {
  await call('issue_create', ISSUE)
  await call('issue_transition', { id: '1', to: 'discarded', motivo: 'el cliente lo sacó' })
  const saved = db().issues[0]!
  expect(saved).toMatchObject({ state: 'CLOSED', stateReason: 'NOT_PLANNED', labels: ['seckert:discarded'] })
  expect(saved.comments).toEqual(['Descartado: el cliente lo sacó'])
  expect((await call('issue_get', { id: '1' })).value.state).toBe('discarded')
})

test('issue_get lee los estados de GitHub: rama enlazada y PR enlazado', async () => {
  await call('issue_create', ISSUE)
  await call('issue_transition', { id: '1', to: 'approved', aprobacion: 'dale' })
  const data = db()
  data.issues[0]!.branches = ['feature/1-exportar']
  writeFileSync(state, JSON.stringify(data))
  expect((await call('issue_get', { id: '1' })).value.state).toBe('in-progress')
  data.issues[0]!.prs = [{ number: 30 }]
  writeFileSync(state, JSON.stringify(data))
  expect((await call('issue_get', { id: '1' })).value.state).toBe('in-review')
})

test('issue_list resume los abiertos y filtra por estado', async () => {
  await call('issue_create', ISSUE)
  await call('issue_create', { ...ISSUE, title: 'Arreglar typo', route: 'FIX' })
  await call('issue_transition', { id: '2', to: 'approved', aprobacion: 'dale' })
  const all = (await call('issue_list', {})).value
  expect(all).toEqual([
    { id: '1', title: ISSUE.title, state: 'draft', route: 'CHANGE', url: 'https://github.com/acme/tienda/issues/1' },
    { id: '2', title: 'Arreglar typo', state: 'approved', route: 'FIX', url: 'https://github.com/acme/tienda/issues/2' },
  ])
  expect((await call('issue_list', { state: 'approved' })).value.map((i: { id: string }) => i.id)).toEqual(['2'])
})

test('un estado que muestra GitHub no se marca a mano', async () => {
  await call('issue_create', ISSUE)
  const { error } = await call('issue_transition', { id: '1', to: 'in-progress' })
  expect(error).toBeTruthy()
})

test('si gh falla, el error lo dice', async () => {
  const { error } = await call('issue_get', { id: '99' })
  expect(error).toContain('gh issue view falló')
})
