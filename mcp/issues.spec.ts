// Las herramientas de issues en el servidor compilado, con un `gh` falso en el
// PATH que guarda los issues en un JSON (mcp/fake-gh.mjs).
import { afterAll, beforeAll, beforeEach, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

import { branchFor } from '../lib/issue'
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
  problem: 'El cliente quiere bajar los pedidos del mes.',
  quote: 'Necesito un botón que me baje todo en Excel.',
  outcome: 'Los pedidos del mes se bajan en un archivo.',
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
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'init'], { cwd: repo })
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

const branch = () => execFileSync('git', ['branch', '--show-current'], { cwd: repo, encoding: 'utf8' }).trim()

beforeEach(() => {
  reset()
  execFileSync('git', ['switch', '-q', 'main'], { cwd: repo })
  for (const b of execFileSync('git', ['branch', '--format=%(refname:short)'], { cwd: repo, encoding: 'utf8' }).split('\n'))
    if (b && b !== 'main') execFileSync('git', ['branch', '-q', '-D', b], { cwd: repo })
})

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

test('issue_create escribe y issue_get devuelve todos los campos v2', async () => {
  const full = {
    ...ISSUE,
    decisions: [{ text: 'Separador ;', by: 'Abel', date: '2026-11-09' }],
    outOfScope: ['Excel nativo'],
    constraints: ['No cambiar la API de pedidos'],
    references: ['src/Pedidos.tsx'],
    questions: [{ id: 'P1', text: '¿Incluimos los cancelados?', owner: 'Abel' }],
    routeWhy: 'toca datos de pedidos',
    origin: { source: 'Chat con Abel', requestedBy: 'Abel' },
  }
  const { error } = await call('issue_create', full)
  expect(error).toBeNull()
  const body: string = db().issues[0]!.body
  expect(body.startsWith('<!-- seckert:issue v2 -->')).toBe(true)
  for (const h of ['## Problem', '## Outcome', '## Decisions', '## Out of scope', '## Constraints', '## References', '## Open questions', '## Route', '## Origin']) expect(body).toContain(h)
  const { value } = await call('issue_get', { id: '1' })
  expect(value).toMatchObject({ outcome: ISSUE.outcome, decisions: full.decisions, outOfScope: full.outOfScope, questions: full.questions, routeWhy: 'toca datos de pedidos', origin: full.origin })
})

test('issue_create pide escribir el contenido en el idioma del pedido, con títulos en inglés', async () => {
  const { tools } = await client.listTools()
  const description = tools.find(t => t.name === 'issue_create')!.description!
  expect(description).toMatch(/language of the request/i)
  expect(description).toMatch(/headings.*English/i)
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

test('la rama de un issue sale de su ruta y su título', () => {
  expect(branchFor('Exportar pedidos a CSV', 'CHANGE')).toBe('feature/exportar-pedidos-a-csv')
  expect(branchFor('Arreglar el título de la página', 'FIX')).toBe('fix/arreglar-el-titulo-de-la-pagina')
  expect(branchFor('Regla nueva: envío ¿gratis?', 'SPEC')).toBe('fix/regla-nueva-envio-gratis')
  const long = branchFor('Un título muy largo que no entra entero en el nombre de una rama', 'FIX')
  expect(long.length).toBeLessThanOrEqual(44)
  expect(long).toMatch(/^fix\/[a-z0-9]+(-[a-z0-9]+)*$/)
})

test('issue_take crea la rama enlazada al issue aprobado y se para en ella', async () => {
  await call('issue_create', ISSUE)
  await call('issue_transition', { id: '1', to: 'approved', aprobacion: 'dale' })
  const { value, error } = await call('issue_take', { id: '1' })
  expect(error).toBeNull()
  expect(value).toMatchObject({ id: '1', route: 'CHANGE', branch: 'feature/exportar-pedidos-a-csv', how: 'creada', criteria: ISSUE.criteria, quote: ISSUE.quote })
  expect(db().calls.find(c => c[1] === 'develop' && c.includes('--name'))).toEqual([
    'issue', 'develop', '1', '--repo', 'acme/tienda', '--name', 'feature/exportar-pedidos-a-csv', '--base', 'main', '--checkout',
  ])
  expect(branch()).toBe('feature/exportar-pedidos-a-csv')
  expect((await call('issue_get', { id: '1' })).value.state).toBe('in-progress')
})

test('issue_take retoma un issue en curso en su rama enlazada, sin crear otra', async () => {
  await call('issue_create', { ...ISSUE, route: 'FIX' })
  await call('issue_transition', { id: '1', to: 'approved', aprobacion: 'dale' })
  execFileSync('git', ['branch', 'fix/exportar'], { cwd: repo })
  const data = db()
  data.issues[0]!.branches = ['fix/exportar']
  writeFileSync(state, JSON.stringify(data))
  const { value } = await call('issue_take', { id: '1' })
  expect(value).toMatchObject({ branch: 'fix/exportar', how: 'ya existía' })
  expect(db().calls.some(c => c[1] === 'develop' && c.includes('--name'))).toBe(false)
  expect(branch()).toBe('fix/exportar')
})

test('issue_take no toma un issue sin aprobar ni uno ya en revisión', async () => {
  await call('issue_create', ISSUE)
  expect((await call('issue_take', { id: '1' })).error).toContain('aprob')
  await call('issue_transition', { id: '1', to: 'approved', aprobacion: 'dale' })
  const data = db()
  data.issues[0]!.prs = [{ number: 30 }]
  writeFileSync(state, JSON.stringify(data))
  expect((await call('issue_take', { id: '1' })).error).toContain('in-review')
  expect(branch()).toBe('main')
})

test('pr_draft de un FIX tomado de un issue, sin change: el cuerpo sale del issue y lleva Fixes #n', async () => {
  await call('issue_create', { ...ISSUE, title: 'Arreglar el total', route: 'FIX' })
  await call('issue_transition', { id: '1', to: 'approved', aprobacion: 'dale' })
  await call('issue_take', { id: '1' })
  writeFileSync(join(repo, 'src', 'total.ts'), 'x\n')
  execFileSync('git', ['add', '-A'], { cwd: repo })
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'fix: total'], { cwd: repo })

  const { value, error } = await call('pr_draft', { issue: '1' })
  expect(error).toBeNull()
  expect(value).toMatchObject({ base: 'main', branch: 'fix/arreglar-el-total', title: 'fix: arreglar el total', issue: '1', files: 1 })
  const body: string = value.body
  expect(body.startsWith('Fixes #1\n\n## Why')).toBe(true)
  expect(body).toContain(`## Why\n\n${ISSUE.problem}\n\n> ${ISSUE.quote}`)
  expect(body).toContain('## What\n\n- Hay un botón "Exportar"\n- El CSV trae fecha y total')
  expect(body).toContain('## How to revert\n\n<!-- seckert: completar -->')
  const order = ['## Why', '## What', '## Testing', '## Risk', '## How to revert', '## Evidence'].map(h => body.indexOf(h))
  expect([...order].sort((a, b) => a - b)).toEqual(order)
})
