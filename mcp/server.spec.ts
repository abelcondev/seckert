// Prueba el servidor ya compilado, como lo arranca Claude Code: `node mcp/dist/server.mjs`
// por stdio, parado en un repo temporal con sdd/changes.
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const SERVER = resolve(import.meta.dir, 'dist/server.mjs')

const change = (status: string, tasks: string, log = '') => `---
status: ${status}
specs: [pedidos]
design: none
branch: feature/x
---

# Título

## Why

Porque sí.

## What

- Exporta los pedidos a CSV.

## Open questions

- **P1** ¿Con qué separador?

## Tasks

${tasks}

## Log

- **L1** (pedido original, verbatim): exportar pedidos
${log}`

let repo: string
let client: Client

function text(result: unknown): unknown {
  const content = (result as { content: { type: string; text: string }[] }).content
  return JSON.parse(content[0]!.text)
}

beforeAll(async () => {
  repo = mkdtempSync(join(tmpdir(), 'seckert-mcp-'))
  execFileSync('git', ['init', '-q', '-b', 'main', repo])
  mkdirSync(join(repo, 'sdd/changes'), { recursive: true })
  mkdirSync(join(repo, 'src'))
  writeFileSync(
    join(repo, 'sdd/changes/2026-11-01-csv.md'),
    change(
      'approved',
      '- [x] T1 Endpoint <!-- commit: abc1234 -->\n- [ ] T2 Botón: en la lista <!-- commit: -->',
      '- 2026-11-02 verify: FALLA "Exporta los pedidos a CSV" (vacío).\n',
    ),
  )
  writeFileSync(join(repo, 'sdd/changes/2026-11-03-cupones.md'), change('proposed', '- [ ] T1 Modelo <!-- commit: -->'))
  writeFileSync(join(repo, 'sdd/changes/2026-10-01-viejo.md'), change('done', '- [x] T1 Algo <!-- commit: 1111111 -->'))

  client = new Client({ name: 'test', version: '0.0.0' })
  // Parado en una subcarpeta: el servidor tiene que encontrar la raíz del repo.
  await client.connect(new StdioClientTransport({ command: 'node', args: [SERVER], env: { ...(process.env as Record<string, string>), TZ: 'UTC' }, cwd: join(repo, 'src') }))
})

afterAll(async () => {
  await client?.close()
  rmSync(repo, { recursive: true, force: true })
})

test('expone change_list y change_get como solo lectura', async () => {
  const { tools } = await client.listTools()
  const byName = Object.fromEntries(tools.map(tool => [tool.name, tool]))
  expect(Object.keys(byName)).toEqual(expect.arrayContaining(['change_list', 'change_get']))
  expect(byName.change_list?.annotations?.readOnlyHint).toBe(true)
  expect(byName.change_get?.annotations?.readOnlyHint).toBe(true)
})

test('change_list lista los abiertos con su progreso y deja fuera los done', async () => {
  const list = text(await client.callTool({ name: 'change_list', arguments: {} })) as Record<string, unknown>[]
  expect(list.map(c => c.slug)).toEqual(['csv', 'cupones'])
  expect(list[0]).toMatchObject({
    slug: 'csv',
    file: 'sdd/changes/2026-11-01-csv.md',
    status: 'approved',
    done: 1,
    total: 2,
    next: 'T2 Botón: en la lista',
    questions: 1,
    branch: 'feature/x',
    lastVerify: '2026-11-02 verify: FALLA "Exporta los pedidos a CSV" (vacío).',
  })
})

test('change_list con done incluye los cerrados', async () => {
  const list = text(await client.callTool({ name: 'change_list', arguments: { done: true } })) as { slug: string }[]
  expect(list.map(c => c.slug)).toEqual(['viejo', 'csv', 'cupones'])
})

test('change_get devuelve el change estructurado con los fallos por punto', async () => {
  const got = text(await client.callTool({ name: 'change_get', arguments: { slug: 'csv' } })) as Record<string, unknown>
  expect(got).toMatchObject({
    slug: 'csv',
    status: 'approved',
    what: ['Exporta los pedidos a CSV.'],
    questions: [{ id: 'P1', text: '¿Con qué separador?' }],
    failures: { 'Exporta los pedidos a CSV': 1 },
  })
  expect((got.tasks as unknown[]).length).toBe(2)
})

test('change_get sin slug toma el único approved', async () => {
  const got = text(await client.callTool({ name: 'change_get', arguments: {} })) as { slug: string }
  expect(got.slug).toBe('csv')
})

test('change_get con un slug que no existe responde un error con los que hay', async () => {
  const result = (await client.callTool({ name: 'change_get', arguments: { slug: 'nada' } })) as {
    isError?: boolean
    content: { text: string }[]
  }
  expect(result.isError).toBe(true)
  expect(result.content[0]!.text).toContain('csv')
})

test('change_create escribe la propuesta con la plantilla, la fecha de hoy y L1 verbatim', async () => {
  const result = text(
    await client.callTool({
      name: 'change_create',
      arguments: {
        slug: 'envio-express',
        title: 'Envío express',
        why: 'Los clientes quieren recibir hoy.',
        what: ['El envío express cuesta $15.', 'Si el pedido supera $100, muestra: "Express gratis"'],
        tasks: ['Calcular el costo express (sensible: dinero)', 'Opción en el checkout'],
        questions: ['¿Aplica a todo el país?'],
        specs: ['pedidos'],
        pedido: 'quiero envío express a $15,\ngratis desde $100',
      },
    }),
  ) as { file: string; slug: string }
  const date = new Date().toLocaleDateString('sv-SE', { timeZone: 'UTC' })
  expect(result.file).toBe(`sdd/changes/${date}-envio-express.md`)

  const written = readFileSync(join(repo, result.file), 'utf8')
  expect(written).toContain('status: proposed\nspecs: [pedidos]\ndesign: none\nbranch: feature/envio-express\n')
  expect(written).toContain('# Envío express\n\n## Why\n\nLos clientes quieren recibir hoy.\n')
  expect(written).toContain('- [ ] T1 Calcular el costo express (sensible: dinero) <!-- commit: -->\n- [ ] T2 Opción en el checkout <!-- commit: -->')
  expect(written).toContain('- **P1** ¿Aplica a todo el país?')
  expect(written).toContain('- **L1** (pedido original, verbatim): quiero envío express a $15,\ngratis desde $100\n')

  const got = text(await client.callTool({ name: 'change_get', arguments: { slug: 'envio-express' } })) as Record<string, unknown>
  expect(got).toMatchObject({ status: 'proposed', design: null, branch: 'feature/envio-express' })
  expect(got.what).toEqual(['El envío express cuesta $15.', 'Si el pedido supera $100, muestra: "Express gratis"'])
})

test('change_create enlaza el change a su issue con issue: #n', async () => {
  const result = text(
    await client.callTool({
      name: 'change_create',
      arguments: { slug: 'exportar-csv', title: 'Exportar', why: 'x', what: ['x'], tasks: ['x'], pedido: 'x', issue: '12' },
    }),
  ) as { file: string }
  expect(readFileSync(join(repo, result.file), 'utf8')).toContain('branch: feature/exportar-csv\nissue: #12\n---')
  const got = text(await client.callTool({ name: 'change_get', arguments: { slug: 'exportar-csv' } })) as Record<string, unknown>
  expect(got.issue).toBe('12')
})

test('change_create no pisa un change que ya existe ni acepta un slug inválido', async () => {
  const again = (await client.callTool({
    name: 'change_create',
    arguments: { slug: 'csv', title: 'x', why: 'x', what: ['x'], tasks: ['x'], pedido: 'x' },
  })) as { isError?: boolean; content: { text: string }[] }
  expect(again.isError).toBe(true)
  expect(again.content[0]!.text).toContain('2026-11-01-csv.md')

  const bad = (await client.callTool({
    name: 'change_create',
    arguments: { slug: 'Envío Rápido', title: 'x', why: 'x', what: ['x'], tasks: ['x'], pedido: 'x' },
  })) as { isError?: boolean }
  expect(bad.isError).toBe(true)
})

test('change_create sin preguntas deja la sección vacía, y con design lo anota', async () => {
  const result = text(
    await client.callTool({
      name: 'change_create',
      arguments: {
        slug: 'banner',
        title: 'Banner',
        why: 'x',
        what: ['Muestra el banner'],
        tasks: ['Banner'],
        design: 'https://claude.ai/artifact/abc',
        pedido: 'un banner',
      },
    }),
  ) as { file: string }
  const written = readFileSync(join(repo, result.file), 'utf8')
  expect(written).toContain('design: https://claude.ai/artifact/abc')
  expect(written).toContain('## Open questions\n\n## Tasks')
  expect(written).toContain('specs: []')
})

test('el contexto de inicio lista los changes abiertos con el mismo lector', () => {
  const out = execFileSync('sh', [resolve(import.meta.dir, '../scripts/session-context.sh')], { cwd: join(repo, 'src'), encoding: 'utf8' })
  expect(out).toContain('Open changes:\n- sdd/changes/2026-11-01-csv.md (approved, 1/2 tasks)\n- sdd/changes/2026-11-03-cupones.md (proposed, 0/1 tasks)')
  expect(out).not.toContain('viejo')
})
