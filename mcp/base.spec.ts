// tests_on_base: ¿un test que falla en la rama ya fallaba en la base?
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const SERVER = resolve(import.meta.dir, 'dist/server.mjs')

let repo: string
let client: Client
type Result = { isError?: boolean; content: { text: string }[] }

const git = (...args: string[]) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim()
const put = (file: string, text: string) => {
  mkdirSync(join(repo, file, '..'), { recursive: true })
  writeFileSync(join(repo, file), text)
}
const run = async (args: Record<string, unknown>) => {
  const result = (await client.callTool({ name: 'tests_on_base', arguments: args })) as Result
  return { result, value: result.isError ? null : JSON.parse(result.content[0]!.text) }
}
const worktrees = () => git('worktree', 'list').split('\n').length

beforeAll(async () => {
  repo = mkdtempSync(join(tmpdir(), 'seckert-mcp-b-'))
  git('init', '-q', '-b', 'main')
  git('config', 'user.email', 't@t')
  git('config', 'user.name', 't')
  // En la base: uno ya roto y uno sano. Los "tests" son scripts de sh.
  put('t/roto.sh', 'exit 1\n')
  put('t/sano.sh', 'exit 0\n')
  put('package.json', '{}\n')
  git('add', '.')
  git('commit', '-q', '-m', 'base')
  git('switch', '-q', '-c', 'feature/x')
  put('t/sano.sh', 'exit 1\n') // el change lo rompió
  put('t/nuevo.sh', 'exit 1\n') // test nuevo del change
  git('add', '.')
  git('commit', '-q', '-m', 'feat: x')
  client = new Client({ name: 'test', version: '0.0.0' })
  await client.connect(new StdioClientTransport({ command: 'node', args: [SERVER], cwd: repo }))
})

afterAll(async () => {
  await client?.close()
  rmSync(repo, { recursive: true, force: true })
})

test('distingue un fallo que ya estaba en la base de uno del change y de un test nuevo', async () => {
  const before = worktrees()
  const { value } = await run({ tests: ['t/roto.sh', 't/sano.sh', 't/nuevo.sh'], runner: 'sh' })
  expect(value.base).toBe('main')
  expect(value.resultados).toEqual([
    expect.objectContaining({ test: 't/roto.sh', veredicto: 'PREEXISTENTE', comando: 'sh t/roto.sh' }),
    expect.objectContaining({ test: 't/sano.sh', veredicto: 'FALLA', motivo: expect.stringContaining('pasa en la base') }),
    expect.objectContaining({ test: 't/nuevo.sh', veredicto: 'FALLA', motivo: expect.stringContaining('no existe en la base') }),
  ])
  // El worktree temporal se borra siempre.
  expect(worktrees()).toBe(before)
})

test('si el runner no se puede correr en la base, es FALLA', async () => {
  const { value } = await run({ tests: ['t/roto.sh'], runner: 'comando-que-no-existe' })
  expect(value.resultados[0]).toMatchObject({ veredicto: 'FALLA', motivo: expect.stringContaining('no se pudo correr') })
})

test('enlaza node_modules del proyecto sin instalar nada', async () => {
  put('node_modules/marca.txt', 'x\n')
  put('t/usa-deps.sh', 'test -f node_modules/marca.txt && exit 1 || exit 0\n')
  git('add', 't/usa-deps.sh')
  git('commit', '-q', '-m', 'test usa deps')
  git('switch', '-q', 'main')
  git('checkout', '-q', 'feature/x', '--', 't/usa-deps.sh')
  git('commit', '-q', '-m', 'test en base')
  git('switch', '-q', 'feature/x')
  git('rebase', '-q', 'main')
  const { value } = await run({ tests: ['t/usa-deps.sh'], runner: 'sh' })
  // En la base falla solo si encuentra node_modules enlazado.
  expect(value.resultados[0]).toMatchObject({ veredicto: 'PREEXISTENTE' })
  expect(existsSync(join(repo, 'node_modules/marca.txt'))).toBe(true)
})

test('si el change tocó package.json o un lockfile, no compara: FALLA para todos', async () => {
  put('package.json', '{"dependencies":{"x":"1"}}\n')
  git('add', 'package.json')
  git('commit', '-q', '-m', 'deps')
  const { value } = await run({ tests: ['t/roto.sh'], runner: 'sh' })
  expect(value.resultados[0]).toMatchObject({ veredicto: 'FALLA', motivo: expect.stringContaining('dependencias') })
})

test('sin tests es un error', async () => {
  const { result } = await run({ tests: [], runner: 'sh' })
  expect(result.isError).toBe(true)
  expect(readdirSync(tmpdir()).length).toBeGreaterThan(0)
})
