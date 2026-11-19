// checks_on_base: ¿un error de lint o typecheck es del change o ya estaba en la base?
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

import { newLines, normalizeLine } from './base'

const SERVER = resolve(import.meta.dir, 'dist/server.mjs')
let client: Client
type Result = { isError?: boolean; content: { text: string }[] }
const check = async (comando: string) => {
  const result = (await client.callTool({ name: 'checks_on_base', arguments: { comando } })) as Result
  return result.isError ? { error: result.content[0]!.text } : JSON.parse(result.content[0]!.text)
}

let repo: string
const git = (...args: string[]) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim()
const put = (file: string, text: string) => {
  mkdirSync(join(repo, file, '..'), { recursive: true })
  writeFileSync(join(repo, file), text)
}
const commit = (msg: string) => {
  git('add', '.')
  git('commit', '-q', '-m', msg)
}
const worktrees = () => git('worktree', 'list').split('\n').length

// El "linter": imprime cada línea de errores.txt con su número de línea, como
// lo haría uno real, y falla si hay alguna.
const LINT = 'sh lint.sh'
const LINT_SH = 'test -s errores.txt || exit 0\nawk \'NF { print "src/a.ts:" NR ":3 " $0 }\' errores.txt\necho "Checked 12 files in $$ms"\nexit 1\n'

beforeAll(async () => {
  repo = mkdtempSync(join(tmpdir(), 'seckert-checks-'))
  git('init', '-q', '-b', 'main')
  git('config', 'user.email', 't@t')
  git('config', 'user.name', 't')
  put('lint.sh', LINT_SH)
  put('errores.txt', 'noUnusedVariables: x\n')
  put('package.json', '{}\n')
  commit('base')
  git('switch', '-q', '-c', 'feature/x')
  client = new Client({ name: 'test', version: '0.0.0' })
  const env = { ...(process.env as Record<string, string>), CLAUDE_PROJECT_DIR: repo }
  await client.connect(new StdioClientTransport({ command: 'node', args: [SERVER], cwd: repo, env }))
})

afterAll(async () => {
  await client?.close()
  rmSync(repo, { recursive: true, force: true })
})

test('normaliza colores, números y espacios', () => {
  expect(normalizeLine('\x1b[31msrc/a.ts:12:4\x1b[0m  error  x')).toBe('src/a.ts:#:# error x')
})

test('una línea repetida más veces que en la base es nueva', () => {
  expect(newLines('a:1 x\na:9 x\nb', 'a:3 x')).toEqual(['a:9 x', 'b'])
})

test('sin errores en la rama es PASA y no prepara la base', async () => {
  put('errores.txt', '')
  commit('limpio')
  const before = worktrees()
  expect(await check(LINT)).toMatchObject({ veredicto: 'PASA', nuevos: [] })
  expect(worktrees()).toBe(before)
})

test('los mismos errores que en la base, aunque cambien de línea, son PREEXISTENTE', async () => {
  put('errores.txt', '\nnoUnusedVariables: x\n')
  commit('mismo error, otra línea')
  const before = worktrees()
  expect(await check(LINT)).toMatchObject({ veredicto: 'PREEXISTENTE', base: 'main', nuevos: [] })
  expect(worktrees()).toBe(before)
})

test('un error que no estaba en la base es FALLA y lo nombra', async () => {
  put('errores.txt', 'noUnusedVariables: x\nnoExplicitAny: y\n')
  commit('error nuevo')
  const result = await check(LINT)
  expect(result.veredicto).toBe('FALLA')
  expect(result.nuevos).toEqual(['src/a.ts:2:3 noExplicitAny: y'])
})

test('si en la base pasa, todos los errores son del change', async () => {
  git('switch', '-q', 'main')
  put('errores.txt', '')
  commit('base limpia')
  git('switch', '-q', 'feature/x')
  git('rebase', '-q', '-X', 'theirs', 'main')
  put('errores.txt', 'noUnusedVariables: x\n')
  commit('error en la rama')
  expect(await check(LINT)).toMatchObject({ veredicto: 'FALLA', motivo: expect.stringContaining('pasa en la base') })
})

test('si el comando no se puede correr, es FALLA', async () => {
  expect(await check('comando-que-no-existe')).toMatchObject({ veredicto: 'FALLA', motivo: expect.stringContaining('no se pudo correr') })
})

test('si el change tocó package.json, no compara: FALLA', async () => {
  put('package.json', '{"devDependencies":{"x":"1"}}\n')
  commit('deps')
  expect(await check(LINT)).toMatchObject({ veredicto: 'FALLA', motivo: expect.stringContaining('dependencias') })
})

test('sin comando es un error', async () => {
  expect(await check(' ')).toMatchObject({ error: expect.stringContaining('comando') })
})
