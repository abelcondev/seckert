import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const FILE = '/repo/sdd/changes/2026-11-01-csv.md'
const CHANGE = `---
status: proposed
branch: feature/csv
---

# CSV

## What

- Exporta.

## Tasks

- [x] T1 Endpoint <!-- commit: abc1234 -->
- [ ] T2 Botón <!-- commit: -->

## Log

- **L1** (pedido original, verbatim): x
`

function stub(on: On, files: Record<string, string>) {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('fs.exists', (_, e) => ({ value: e.path in files }))
  on('fs.read', (_, e) => ({ value: files[e.path] ?? '' }))
  on('fs.list', () => ({ value: [] }))
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('tool.call', () => ({ result: { filePath: FILE } }))
}

test('cambiar el status a mano se rechaza y nombra la herramienta', async ($, on) => {
  stub(on, { [FILE]: CHANGE })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ran = await $.tool.call({ tool: 'Edit', file_path: FILE, old_string: 'status: proposed', new_string: 'status: approved' })
  expect(ran.deny).toContain('change_transition')
})

test('marcar una tarea a mano se rechaza; reabrirla y editar el resto, no', async ($, on) => {
  stub(on, { [FILE]: CHANGE })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const mark = await $.tool.call({ tool: 'Edit', file_path: FILE, old_string: '- [ ] T2 Botón', new_string: '- [x] T2 Botón' })
  expect(mark.deny).toContain('task_complete')
  const reopen = await $.tool.call({ tool: 'Edit', file_path: FILE, old_string: '- [x] T1 Endpoint', new_string: '- [ ] T1 Endpoint' })
  expect(reopen.deny).toBeUndefined()
  const what = await $.tool.call({ tool: 'Edit', file_path: FILE, old_string: '- Exporta.', new_string: '- Exporta a CSV.' })
  expect(what.deny).toBeUndefined()
})

test('Write: reescribir con otro status se rechaza; un change nuevo en proposed pasa', async ($, on) => {
  stub(on, { [FILE]: CHANGE })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const rewrite = await $.tool.call({ tool: 'Write', file_path: FILE, content: CHANGE.replace('status: proposed', 'status: done') })
  expect(rewrite.deny).toContain('change_transition')
  const fresh = await $.tool.call({ tool: 'Write', file_path: '/repo/sdd/changes/2026-11-05-nuevo.md', content: CHANGE.replace('- [x] T1', '- [ ] T1') })
  expect(fresh.deny).toBeUndefined()
  const freshDone = await $.tool.call({ tool: 'Write', file_path: '/repo/sdd/changes/2026-11-05-otro.md', content: CHANGE })
  expect(freshDone.deny).toContain('task_complete')
})

test('archivos fuera de sdd/changes no se miran', async ($, on) => {
  stub(on, { '/repo/notas.md': CHANGE })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ran = await $.tool.call({ tool: 'Edit', file_path: '/repo/notas.md', old_string: 'status: proposed', new_string: 'status: done' })
  expect(ran.deny).toBeUndefined()
})

test('una spec se edita con Edit y Write sin rechazo', async ($, on) => {
  stub(on, { '/repo/sdd/specs/pedidos.md': '# Pedidos\n\n## Envío\n\nDesde $50.\n' })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const edit = await $.tool.call({ tool: 'Edit', file_path: '/repo/sdd/specs/pedidos.md', old_string: '$50', new_string: '$60' })
  expect(edit.deny).toBeUndefined()
  const write = await $.tool.call({ tool: 'Write', file_path: '/repo/sdd/specs/pagos.md', content: '# Pagos\n' })
  expect(write.deny).toBeUndefined()
})

// Bash: el engine de prueba "corre" el comando aplicando `edit` a los archivos.
function bashStub(on: On, files: Record<string, string>, edit: (files: Record<string, string>) => void) {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('fs.exists', (_, e) => ({ value: e.path in files || e.path === '/repo/sdd/changes' }))
  on('fs.read', (_, e) => ({ value: files[e.path] ?? '' }))
  on('fs.write', (_, e) => {
    files[e.path] = e.text
    return { value: undefined }
  })
  on('fs.list', (_, e) => ({
    value: Object.keys(files)
      .filter(path => path.startsWith(`${e.path}/`))
      .map(path => ({ name: path.split('/').pop()!, kind: 'file' as const, size: 1, mtimeMs: 1, isLink: false })),
  }))
  on('process.run', () => ({ value: { exitCode: 0, stdout: '/repo\nmain\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('tool.call', () => {
    edit(files)
    return { result: { stdout: '', stderr: '', interrupted: false } }
  })
}

test('Bash sobre sdd/ corre y no se restaura después, aunque toque el status o mezcle git', async ($, on) => {
  const files = { [FILE]: CHANGE }
  bashStub(on, files, f => {
    f[FILE] = f[FILE]!.replace('status: proposed', 'status: approved').replace('- Exporta.', '- Exporta a CSV.')
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ran = await $.tool.call({ tool: 'Bash', command: "git stash pop && sed -i '' 's/a/b/' sdd/changes/2026-11-01-csv.md" })
  expect(ran.deny).toBeUndefined()
  expect(files[FILE]).toContain('- Exporta a CSV.')
})
