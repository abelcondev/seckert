// Prueba el servidor ya compilado, como lo arranca Claude Code: `node mcp/dist/server.mjs`
// por stdio, parado en una subcarpeta de un repo temporal. Los changes viven en su issue (gh falso).
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { fixture, type Fixture } from './fixture'

const change = (slug: string, status: string, tasks: string, log = '') => `---
status: ${status}
specs: [pedidos]
design: none
branch: feature/${slug}
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

let fx: Fixture
let repo: string
let client: Fixture['client']

function text(result: unknown): unknown {
  const content = (result as { content: { type: string; text: string }[] }).content
  return JSON.parse(content[0]!.text)
}

beforeAll(async () => {
  // Parado en una subcarpeta: el servidor tiene que encontrar la raíz del repo.
  fx = await fixture('seckert-mcp-', r => {
    mkdirSync(join(r, 'src'))
    writeFileSync(join(r, 'src/.keep'), '')
  }, 'src')
  repo = fx.repo
  client = fx.client
  fx.seedChange(
    change(
      'csv',
      'approved',
      '- [x] T1 Endpoint <!-- commit: abc1234 -->\n- [ ] T2 Botón: en la lista <!-- commit: -->',
      '- 2026-11-02 verify: FALLA "Exporta los pedidos a CSV" (vacío).\n',
    ),
  )
  fx.seedChange(change('cupones', 'proposed', '- [ ] T1 Modelo <!-- commit: -->'))
  fx.seedChange(change('viejo', 'done', '- [x] T1 Algo <!-- commit: 1111111 -->'))
})

afterAll(async () => {
  await fx?.close()
})

// Un issue tomado, sin plan todavía: change_create le adjunta el plan.
async function issue(title: string): Promise<string> {
  const created = text(
    await client.callTool({ name: 'issue_create', arguments: { title, problem: 'x', outcome: 'x', criteria: ['Muestra el banner'], route: 'CHANGE', kind: 'feature' } }),
  ) as { id: string }
  return created.id
}

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
    file: 'issue #1',
    status: 'approved',
    done: 1,
    total: 2,
    next: 'T2 Botón: en la lista',
    questions: 1,
    branch: 'feature/csv',
    lastVerify: '2026-11-02 verify: FALLA "Exporta los pedidos a CSV" (vacío).',
  })
})

test('change_list con done incluye los cerrados', async () => {
  const list = text(await client.callTool({ name: 'change_list', arguments: { done: true } })) as { slug: string }[]
  expect(list.map(c => c.slug)).toEqual(['csv', 'cupones', 'viejo'])
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

test('change_create sin issue responde que hace falta uno', async () => {
  const result = (await client.callTool({ name: 'change_create', arguments: { slug: 'suelto', title: 'x', tasks: ['x'], pedido: 'x' } })) as {
    isError?: boolean
    content: { text: string }[]
  }
  expect(result.isError).toBe(true)
  expect(result.content[0]!.text).toContain('issue')
})

test('change_create adjunta el plan al issue con la plantilla y L1 verbatim', async () => {
  const id = await issue('Envío express')
  const result = text(
    await client.callTool({
      name: 'change_create',
      arguments: {
        slug: 'envio-express',
        title: 'Envío express',
        tasks: ['Calcular el costo express (sensible: dinero)', 'Opción en el checkout'],
        questions: ['¿Aplica a todo el país?'],
        specs: ['pedidos'],
        pedido: 'quiero envío express a $15,\ngratis desde $100',
        issue: id,
      },
    }),
  ) as { file: string; slug: string }
  expect(result.file).toBe(`issue #${id}`)

  const written = fx.changeText('envio-express')
  expect(written).toContain(`status: proposed\nspecs: [pedidos]\nbranch: feature/envio-express\nissue: #${id}\n`)
  expect(written).toContain('- [ ] T1 Calcular el costo express (sensible: dinero) <!-- commit: -->\n- [ ] T2 Opción en el checkout <!-- commit: -->')
  expect(written).toContain('- **P1** ¿Aplica a todo el país?')
  expect(written).toContain('- **L1** (pedido original, verbatim): quiero envío express a $15,\ngratis desde $100\n')

  const got = text(await client.callTool({ name: 'change_get', arguments: { slug: 'envio-express' } })) as Record<string, unknown>
  expect(got).toMatchObject({ status: 'proposed', design: null, branch: 'feature/envio-express', issue: id })
  expect(got.what).toEqual(['Muestra el banner'])
})

test('change_create no pisa un plan que ya existe ni acepta un slug inválido', async () => {
  const again = (await client.callTool({
    name: 'change_create',
    arguments: { slug: 'csv', title: 'x', tasks: ['x'], pedido: 'x', issue: '1' },
  })) as { isError?: boolean; content: { text: string }[] }
  expect(again.isError).toBe(true)
  expect(again.content[0]!.text).toContain('#1 ya tiene un plan')

  const bad = (await client.callTool({
    name: 'change_create',
    arguments: { slug: 'Envío Rápido', title: 'x', tasks: ['x'], pedido: 'x', issue: '1' },
  })) as { isError?: boolean }
  expect(bad.isError).toBe(true)
})

test('change_create sin preguntas deja la sección vacía', async () => {
  const id = await issue('Banner')
  await client.callTool({ name: 'change_create', arguments: { slug: 'banner', title: 'Banner', tasks: ['Banner'], pedido: 'un banner', issue: id } })
  const written = fx.changeText('banner')
  expect(written).toContain('## Open questions\n\n## Tasks')
  expect(written).toContain('specs: []')
})

test('el contexto de inicio lista los changes abiertos con el mismo lector', () => {
  const out = execFileSync('sh', [resolve(import.meta.dir, '../scripts/session-context.sh')], { cwd: join(repo, 'src'), encoding: 'utf8' })
  expect(out).toContain('Open changes:\n')
  expect(out).toContain('- issue #1 (approved, 1/2 tasks)\n')
  expect(out).toContain('- issue #2 (proposed, 0/1 tasks)\n')
  expect(out).not.toContain('issue #3')
})
