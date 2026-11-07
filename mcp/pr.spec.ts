// pr_draft y release_draft contra un repo git real.
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
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
const commit = (message: string) => {
  git('add', '-A')
  git('commit', '-q', '-m', message)
}
const call = async (name: string, args: Record<string, unknown>) => {
  const result = (await client.callTool({ name, arguments: args })) as Result
  return result.isError ? { error: result.content[0]!.text } : JSON.parse(result.content[0]!.text)
}

const change = (slug: string, tasks: string, log = '') => `---
status: approved
specs: [pedidos]
design: https://claude.ai/artifact/abc
branch: feature/${slug}
---

# Cupones de descuento

## Why

El checkout no acepta cupones.

## What

**Cupón**
- El cliente escribe un código y se descuenta su porcentaje.
- Un código desconocido no cambia el total.

## Diagram

\`\`\`mermaid
erDiagram
  CUPON ||--o{ PEDIDO : aplica
\`\`\`

## Open questions

## Tasks

${tasks}

## Testing

- Runner: \`bun test\`
- Lógica: tests/cupon.test.ts

## Log

- **L1** (pedido original, verbatim): cupones
${log}`

beforeAll(async () => {
  repo = mkdtempSync(join(tmpdir(), 'seckert-mcp-pr-'))
  git('init', '-q', '-b', 'main')
  git('config', 'user.email', 't@t')
  git('config', 'user.name', 't')
  put('package.json', '{ "name": "tienda", "version": "1.3.2" }\n')
  put('src/app.ts', 'x\n')
  commit('chore: init')
  git('tag', 'v1.3.2')

  git('switch', '-q', '-c', 'feature/cupones')
  put(
    'sdd/changes/2026-11-01-cupones.md',
    change(
      'cupones',
      '- [x] T1 Calcular el descuento (sensible: dinero) <!-- commit: aaaaaaa -->\n- [x] T2 Campo en el checkout <!-- commit: bbbbbbb -->',
      '- 2026-11-02 verify: PASA "El cliente escribe un código y se descuenta su porcentaje"; PASA "Un código desconocido no cambia el total". PREEXISTENTE: tests/envio.spec.ts. Comandos: `bun test`.\n',
    ),
  )
  put('src/payments/cupon.ts', 'x\n')
  put('db/migrations/001_cupones.sql', 'x\n')
  commit('feat(pedidos): cupones de descuento')

  git('switch', '-q', '-c', 'feature/banner', 'main')
  put('sdd/changes/2026-11-03-banner.md', change('banner', '- [x] T1 Banner <!-- commit: ccccccc -->').replace('# Cupones de descuento', '# Banner de bienvenida'))
  put('src/Banner.tsx', 'x\n')
  put('scripts/session-context.sh', 'x\n')
  put('src/useSessionStorage.ts', 'x\n')
  commit('feat(home): banner')

  client = new Client({ name: 'test', version: '0.0.0' })
  await client.connect(new StdioClientTransport({ command: 'node', args: [SERVER], cwd: repo }))
})

afterAll(async () => {
  await client?.close()
  rmSync(repo, { recursive: true, force: true })
})

test('pr_draft arma base, título y cuerpo con Risk de archivos y tareas sensibles y Evidence de la última verificación', async () => {
  git('switch', '-q', 'feature/cupones')
  const pr = await call('pr_draft', { slug: 'cupones' })
  expect(pr.base).toBe('main')
  expect(pr.branch).toBe('feature/cupones')
  expect(pr.title).toBe('feat(pedidos): cupones de descuento')
  expect(pr.has_migration).toBe(true)
  const body: string = pr.body
  expect(body).toContain('## Why\n\nEl checkout no acepta cupones.')
  expect(body).toContain('## What\n\n**Cupón**\n- El cliente escribe un código')
  expect(body).toContain('## Testing\n\n- Runner: `bun test`')
  expect(body).toContain('Diseño: https://claude.ai/artifact/abc')
  expect(body).toContain('## Diagram\n\n```mermaid\nerDiagram\n  CUPON ||--o{ PEDIDO : aplica\n```')
  expect(body).toMatch(/## Risk\n\nRevisá con cuidado: [^\n]*T1 Calcular el descuento[^\n]*db\/migrations\/001_cupones\.sql[^\n]*src\/payments\/cupon\.ts/)
  expect(body).toContain('## How to revert\n\n<!-- seckert: completar -->')
  expect(body).toContain('| El cliente escribe un código y se descuenta su porcentaje | PASA |')
  expect(body).toContain('PREEXISTENTE: tests/envio.spec.ts')
  // Las secciones van en este orden.
  const order = ['## Why', '## What', '## Diagram', '## Testing', '## Risk', '## How to revert', '## Evidence'].map(h => body.indexOf(h))
  expect([...order].sort((a, b) => a - b)).toEqual(order)
})

test('pr_draft sin nada sensible lo dice, y sin verificación también', async () => {
  git('switch', '-q', 'feature/banner')
  const pr = await call('pr_draft', { slug: 'banner' })
  expect(pr.has_migration).toBe(false)
  expect(pr.body).toContain('## Risk\n\nSin lógica sensible: presentación y lógica de bajo riesgo.')
  expect(pr.body).toContain('## Evidence\n\nNunca se verificó.')
})

test('pr_draft en gitflow apunta a develop, y un hotfix a main', async () => {
  git('branch', 'develop', 'main')
  git('switch', '-q', 'feature/banner')
  expect((await call('pr_draft', { slug: 'banner' })).base).toBe('develop')
  git('switch', '-q', '-c', 'hotfix/banner')
  put('sdd/changes/2026-11-03-banner.md', change('banner', '- [x] T1 Banner <!-- commit: ccccccc -->').replace('branch: feature/banner', 'branch: hotfix/banner'))
  commit('fix: hotfix')
  expect((await call('pr_draft', { slug: 'banner' })).base).toBe('main')
  git('switch', '-q', 'main')
  git('branch', '-q', '-D', 'develop', 'hotfix/banner')
})

test('release_draft propone minor si hay feat, la rama según el flujo, notas y los archivos de versión', async () => {
  git('switch', '-q', 'main')
  git('merge', '-q', '--no-ff', '-m', 'Merge feature/cupones', 'feature/cupones')
  put('src/fix.ts', 'x\n')
  commit('fix(checkout): el total no se redondeaba')
  put('docs.md', 'x\n')
  commit('docs: notas')
  put('sdd/changes/2026-11-01-cupones.md', change('cupones', '- [x] T1 x <!-- commit: aaaaaaa -->').replace('status: approved', 'status: done'))
  commit('docs(sdd): cierra cupones')

  const rel = await call('release_draft', {})
  expect(rel).toMatchObject({ last_tag: 'v1.3.2', version: '1.4.0', branch: 'release/1.4.0', from: 'main', version_files: ['package.json'] })
  expect(rel.notes).toContain('## Features\n\n- cupones de descuento')
  expect(rel.notes).toContain('## Fixes\n\n- el total no se redondeaba')
  expect(rel.notes).not.toContain('notas')
  expect(rel.changes_done).toEqual([{ slug: 'cupones', title: 'Cupones de descuento' }])
})

test('release_draft con solo fixes propone patch; con versión indicada la respeta', async () => {
  git('tag', 'v1.4.0')
  put('src/fix2.ts', 'x\n')
  commit('fix: otro')
  expect((await call('release_draft', {})).version).toBe('1.4.1')
  expect((await call('release_draft', { version: '2.0.0' })).branch).toBe('release/2.0.0')
  expect((await call('release_draft', { version: 'dos' })).error).toContain('x.y.z')
})
