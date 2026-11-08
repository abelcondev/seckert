import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const BAND = {
  plugin: 'seckert',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

const APPROVED = `---
status: approved
specs: [pedidos]
design: none
branch: feature/csv-pedidos
---
# Exportar pedidos a CSV

## Tasks

- [x] T1 Endpoint CSV <!-- commit: a3f91c2 -->
- [ ] T2 Filtro por fecha <!-- commit: -->
- [ ] T3 Botón en la lista <!-- commit: -->
`

const DONE = `---
status: done
---
- [x] T1 algo
`

type Files = Record<string, string>


function entries(files: Files, mtimes: Record<string, number>) {
  return Object.keys(files).map(name => ({ name, kind: 'file' as const, size: 1, mtimeMs: mtimes[name] ?? 1, isLink: false }))
}

function engine(on: On, files: Files, branch = 'feature/csv-pedidos', mtimes: Record<string, number> = {}) {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('fs.exists', (_, e) => ({ value: e.path === '/repo/sdd/changes' && Object.keys(files).length > 0 }))
  on('fs.read', (_, e) => ({ value: files[e.path.split('/').pop() ?? ''] ?? '' }))
  on('process.run', () => ({ value: { exitCode: 0, stdout: `/repo\n${branch}\n`, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('fs.list', (_, e) => ({
    value: e.path === '/repo/sdd/changes' ? entries(files, mtimes) : [],
  }))
  on('prompt.submit', (_, e) => ({ text: e.text, context: e.context }))
}

test('la barra muestra el change activo con su progreso y la siguiente tarea', async ($, on) => {
  engine(on, { '2026-10-29-csv-pedidos.md': APPROVED, '2026-10-01-viejo.md': DONE })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const line = (await ui.find({ type: 'Text', text: /csv-pedidos/ }))?.text ?? ''
  expect(line).toContain('seckert · csv-pedidos · 1/3 · sigue: T2 Filtro por fecha')
  // Estás en la rama del change: no se repite.
  expect(line).not.toContain('rama')
  await ui.unmount()
})

test('sin changes abiertos no hay barra ni contexto extra', async ($, on) => {
  engine(on, { '2026-10-01-viejo.md': DONE })
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /engine/ }))?.text).toBe('engine')
  await ui.unmount()

  const sent = await $.prompt.submit({ text: 'arreglá el typo del header', wait: false, origin: { kind: 'composer' } })
  expect(sent.context ?? []).toEqual([])
})

test('el contexto vivo viaja con el mensaje solo cuando el estado cambia', async ($, on) => {
  const files: Files = { '2026-10-29-csv-pedidos.md': APPROVED }
  engine(on, files)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  // Al iniciar ya lo listó el hook de shell: el primer mensaje no lo repite.
  const first = await $.prompt.submit({ text: 'hola', wait: false, origin: { kind: 'composer' } })
  expect(first.context ?? []).toEqual([])

  // Una tarea marcada cambia el estado y el siguiente mensaje lo lleva.
  files['2026-10-29-csv-pedidos.md'] = APPROVED.replace('- [ ] T2', '- [x] T2')
  const changed = await $.prompt.submit({ text: 'seguí', wait: false, origin: { kind: 'composer' } })
  const note = changed.context?.join('\n') ?? ''
  expect(note).toContain('- csv-pedidos (approved, 2/3 tareas; siguiente: T3 Botón en la lista; rama feature/csv-pedidos)')
  expect(note).toContain('Rama actual: feature/csv-pedidos.')

  const second = await $.prompt.submit({ text: 'dale', wait: false, origin: { kind: 'composer' } })
  expect(second.context ?? []).toEqual([])
})

test('la tarea larga se acorta y la rama aparece si no es la actual', async ($, on) => {
  const long = APPROVED.replace('T2 Filtro por fecha', 'T2 Property tabs: read-only content for the tabs that now say "Coming soon"')
  engine(on, { '2026-10-29-csv-pedidos.md': long }, 'chore/otra')
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const line = (await ui.find({ type: 'Text', text: /csv-pedidos/ }))?.text ?? ''
  expect(line).toContain('sigue: T2 Property tabs · rama feature/csv-pedidos')
  expect(line).not.toContain('Coming soon')
  await ui.unmount()
})

test('las preguntas abiertas se cuentan en la barra y en el contexto', async ($, on) => {
  const withQuestions = APPROVED.replace('status: approved', 'status: proposed').replace(
    '## Tasks',
    '## Preguntas abiertas\n\n- ¿Upsell a la app o Web Billing?\n- ¿Límite por workspace o por usuario?\n\n## Tasks',
  )
  const files: Files = { '2026-10-29-csv-pedidos.md': withQuestions }
  engine(on, files)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /csv-pedidos/ }))?.text).toContain('2 preguntas abiertas')
  await ui.unmount()

  // Respondida una, el contexto vivo lo refleja.
  files['2026-10-29-csv-pedidos.md'] = withQuestions.replace('- ¿Upsell a la app o Web Billing?\n', '')
  const sent = await $.prompt.submit({ text: 'dale con la app', wait: false, origin: { kind: 'composer' } })
  expect(sent.context?.join('\n') ?? '').toContain('1 pregunta abierta')
})

test('la plantilla vacía no cuenta como pregunta', async ($, on) => {
  const template = APPROVED.replace('## Tasks', '## Preguntas abiertas\n\n<Decisiones que faltan…>\n\n- <pregunta>\n\n## Tasks')
  engine(on, { '2026-10-29-csv-pedidos.md': template })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /csv-pedidos/ }))?.text).not.toContain('pregunta')
  await ui.unmount()
})

test('una propuesta espera el sí', async ($, on) => {
  engine(on, { '2026-10-29-csv-pedidos.md': APPROVED.replace('status: approved', 'status: proposed') }, 'develop')
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /esperando/ }))?.text).toContain('esperando tu "sí"')
  await ui.unmount()
})

test('fuera de la rama de un change, la barra muestra el último que se tocó aunque otro esté aprobado a medias', async ($, on) => {
  const nuevo = APPROVED.replace('status: approved', 'status: proposed').replace('branch: feature/csv-pedidos', 'branch: feature/<slug>')
  engine(on, { '2026-10-29-csv-pedidos.md': APPROVED, '2026-10-30-marketing-site.md': nuevo }, 'main', {
    '2026-10-29-csv-pedidos.md': 1,
    '2026-10-30-marketing-site.md': 2,
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const line = (await ui.find({ type: 'Text', text: /seckert/ }))?.text ?? ''
  expect(line).toContain('seckert · marketing-site · esperando tu "sí" · +1 más')
  await ui.unmount()
})

test('un change que vive en su issue se lee de la copia en .git/seckert/changes', async ($, on) => {
  const cache = '/repo/.git/seckert/changes'
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('fs.exists', (_, e) => ({ value: e.path === cache }))
  on('fs.read', (_, e) => ({ value: e.path === `${cache}/csv-pedidos.md` ? APPROVED.replace('branch: feature/csv-pedidos', 'branch: feature/csv-pedidos\nissue: #12') : '' }))
  on('process.run', () => ({ value: { exitCode: 0, stdout: '/repo\nfeature/csv-pedidos\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('fs.list', (_, e) => ({ value: e.path === cache ? entries({ 'csv-pedidos.md': '' }, {}) : [] }))
  on('prompt.submit', (_, e) => ({ text: e.text, context: e.context }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const line = (await ui.find({ type: 'Text', text: /csv-pedidos/ }))?.text ?? ''
  expect(line).toContain('seckert · csv-pedidos · 1/3 · sigue: T2 Filtro por fecha')
  await ui.unmount()
})

test('en modo issues, el contexto vivo dice que los pedidos nuevos van a un issue', async ($, on) => {
  const files: Files = { '2026-10-29-csv-pedidos.md': APPROVED }
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('fs.exists', (_, e) => ({ value: e.path === '/repo/sdd/changes' || e.path === '/repo/AGENTS.md' }))
  on('fs.read', (_, e) => ({ value: e.path === '/repo/AGENTS.md' ? '# app\n\n- seckert issues: github\n' : files[e.path.split('/').pop() ?? ''] ?? '' }))
  on('process.run', () => ({ value: { exitCode: 0, stdout: '/repo\nfeature/csv-pedidos\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('fs.list', (_, e) => ({ value: e.path === '/repo/sdd/changes' ? entries(files, {}) : [] }))
  on('prompt.submit', (_, e) => ({ text: e.text, context: e.context }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  files['2026-10-29-csv-pedidos.md'] = APPROVED.replace('- [ ] T2', '- [x] T2')
  const sent = await $.prompt.submit({ text: 'seguí', wait: false, origin: { kind: 'composer' } })
  const note = sent.context?.join('\n') ?? ''
  expect(note).toContain('Los pedidos de trabajo nuevos van a un issue de GitHub')
  expect(note).not.toContain('se hacen directo')
})
