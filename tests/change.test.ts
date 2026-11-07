import { expect, test } from 'claude-code/testing'

import {
  addLog,
  addQuestion,
  applyOps,
  appendLog,
  completeTask,
  failuresByPoint,
  parseChange,
  removeQuestion,
  renderChange,
  reopenTask,
  resyncCommits,
  setBranch,
  setStatus,
  verifyLine,
} from '../lib/change'

const CHANGE = `---
status: approved
specs: [pedidos, pagos]
design: none
branch: feature/descuento
---

# Descuento en el total

## Why

El checkout tiene que poder aplicar un descuento.

## What

**Cálculo**
- Un descuento del 10% sobre un total de $100 deja el total en $90.
- Un código desconocido no cambia el total

## Preguntas abiertas

- **P1** ¿Se acumula con el envío gratis?
- **P3** ¿Tope por pedido?

## Tasks

- [x] T1 Aplicar el descuento porcentual <!-- commit: a1b2c3d -->
- [ ] T2 Validar el código <!-- commit: -->

## Testing

- Runner: \`bun test\`

## Log

- **L1** (pedido original, verbatim): quiero un descuento
- 2026-10-29 verify: FALLA "Un descuento del 10% sobre un total de $100 deja el total en $90" (da 10). \`bun test\`: 1 fail. T1 reabierta.
- 2026-10-30 verify (2ª ronda): FALLA "Un descuento del 10% sobre un total de $100 deja el total en $90." (da 10); PASA "Un código desconocido no cambia el total".
- 2026-10-31: T1 rehecha (a1b2c3d).
`

test('lee el frontmatter, el What, las tareas y las preguntas', () => {
  const change = parseChange(CHANGE)
  expect(change.status).toBe('approved')
  expect(change.specs).toEqual(['pedidos', 'pagos'])
  expect(change.design).toBe(null)
  expect(change.branch).toBe('feature/descuento')
  expect(change.title).toBe('Descuento en el total')
  expect(change.what).toEqual([
    'Un descuento del 10% sobre un total de $100 deja el total en $90.',
    'Un código desconocido no cambia el total',
  ])
  expect(change.tasks).toEqual([
    { id: 'T1', text: 'Aplicar el descuento porcentual', done: true, commit: 'a1b2c3d' },
    { id: 'T2', text: 'Validar el código', done: false, commit: null },
  ])
  expect(change.questions).toEqual([
    { id: 'P1', text: '¿Se acumula con el envío gratis?' },
    { id: 'P3', text: '¿Tope por pedido?' },
  ])
})

test('lee preguntas viejas sin número e ignora el texto de la plantilla', () => {
  const text = CHANGE.replace(/- \*\*P1\*\* .*\n- \*\*P3\*\* .*\n/, '- ¿Una vieja?\n- **P1** <pregunta>\n')
  expect(parseChange(text).questions).toEqual([{ id: null, text: '¿Una vieja?' }])
})

test('cuenta los fallos por punto, también en líneas verify con otra etiqueta y con punto final distinto', () => {
  const failures = failuresByPoint(CHANGE)
  expect(failures.get('Un descuento del 10% sobre un total de $100 deja el total en $90')).toBe(2)
  expect(failures.has('Un código desconocido no cambia el total')).toBe(false)
  expect(parseChange(CHANGE).lastVerify).toContain('2026-10-30 verify')
})

test('cambia el status y la rama sin tocar el resto', () => {
  const text = setBranch(setStatus(CHANGE, 'done'), 'feature/otra')
  expect(parseChange(text).status).toBe('done')
  expect(parseChange(text).branch).toBe('feature/otra')
  expect(text.replace(/^(status|branch):.*$/gm, '')).toBe(CHANGE.replace(/^(status|branch):.*$/gm, ''))
})

test('marca y reabre una tarea', () => {
  const done = completeTask(CHANGE, 'T2', 'ff00aa1')
  expect(parseChange(done).tasks[1]).toEqual({ id: 'T2', text: 'Validar el código', done: true, commit: 'ff00aa1' })
  const reopened = reopenTask(done, 'T1')
  expect(parseChange(reopened).tasks[0]?.done).toBe(false)
  expect(parseChange(reopened).tasks[0]?.commit).toBe('a1b2c3d')
  expect(() => completeTask(CHANGE, 'T9', 'ff00aa1')).toThrow('T9')
})

test('agrega al final del Log', () => {
  const text = appendLog(CHANGE, '2026-11-05: T2 hecha (ff00aa1).')
  expect(text.endsWith('- 2026-10-31: T1 rehecha (a1b2c3d).\n- 2026-11-05: T2 hecha (ff00aa1).\n')).toBe(true)
})

test('una pregunta nueva toma el número siguiente al más alto, y borrar no corre los números', () => {
  const added = addQuestion(CHANGE, '¿Y en dólares?')
  expect(added.id).toBe('P4')
  const removed = removeQuestion(added.text, 'P1')
  expect(parseChange(removed).questions.map(q => q.id)).toEqual(['P3', 'P4'])
})

test('agrega la primera pregunta a una sección vacía', () => {
  const empty = CHANGE.replace(/- \*\*P1\*\* .*\n- \*\*P3\*\* .*\n/, '')
  const added = addQuestion(empty, '¿Algo?')
  expect(added.id).toBe('P1')
  expect(parseChange(added.text).questions).toEqual([{ id: 'P1', text: '¿Algo?' }])
  expect(parseChange(added.text).tasks).toHaveLength(2)
})

test('la línea verify sale siempre con el mismo formato', () => {
  const line = verifyLine('2026-11-05', {
    rows: [
      { point: 'Un código desconocido no cambia el total', verdict: 'PASA', evidence: 'bun test' },
      { point: 'Un descuento del 10%', verdict: 'FALLA', evidence: 'da 10' },
    ],
    preexisting: ['tests/envio.spec.ts'],
    commands: ['bun test'],
  })
  expect(line).toBe(
    '2026-11-05 verify: PASA "Un código desconocido no cambia el total"; FALLA "Un descuento del 10%" (da 10). PREEXISTENTE: tests/envio.spec.ts. Comandos: `bun test`.',
  )
})

test('una tarea sin commit queda con un solo espacio, como en la plantilla', () => {
  const reopened = reopenTask(CHANGE.replace('<!-- commit: a1b2c3d -->', '<!-- commit: -->'), 'T1')
  expect(reopened).toContain('- [ ] T1 Aplicar el descuento porcentual <!-- commit: -->')
})

test('lee y escribe la sección en inglés, y sigue leyendo la vieja en castellano', () => {
  const english = CHANGE.replace('## Preguntas abiertas', '## Open questions')
  expect(parseChange(english).questions.map(q => q.id)).toEqual(['P1', 'P3'])
  const added = addQuestion(english, '¿Otra?')
  expect(added.text).toContain('## Open questions\n\n- **P1** ¿Se acumula con el envío gratis?\n- **P3** ¿Tope por pedido?\n- **P4** ¿Otra?')
  expect(parseChange(removeQuestion(added.text, 'P3')).questions.map(q => q.id)).toEqual(['P1', 'P4'])
  // La vieja sigue funcionando.
  expect(addQuestion(CHANGE, '¿Otra?').text).toContain('## Preguntas abiertas')
})

test('un change nuevo se escribe con ## Open questions', () => {
  const text = renderChange({ slug: 'x', title: 'X', why: 'w', what: ['a'], tasks: ['t'], questions: ['q'], pedido: 'p' })
  expect(text).toContain('## Open questions\n\n- **P1** q')
  expect(text).not.toContain('Preguntas abiertas')
})

// Todo lo que se edita de un change pasa por applyOps (change_update en el MCP).

test('el Log numerado toma el número siguiente al más alto', () => {
  const text = addLog(CHANGE, 'P1: se acumula ("sí").')
  expect(text.endsWith('- 2026-10-31: T1 rehecha (a1b2c3d).\n- **L2** P1: se acumula ("sí").\n')).toBe(true)
  expect(addLog(text, 'otra').endsWith('- **L3** otra\n')).toBe(true)
})

test('responder una pregunta la borra, agrega su respuesta al What y la anota en el Log, en una llamada', () => {
  const { text } = applyOps(CHANGE, [
    { op: 'question_answer', id: 'P1', log: 'se acumula con el envío gratis ("sí, se acumula")' },
    { op: 'what_add', text: 'El descuento se acumula con el envío gratis.' },
  ])
  const change = parseChange(text)
  expect(change.questions.map(q => q.id)).toEqual(['P3'])
  expect(change.what.at(-1)).toBe('El descuento se acumula con el envío gratis.')
  expect(text).toContain('- **L2** P1: se acumula con el envío gratis ("sí, se acumula")\n')
  // El What sigue en su sección, antes de las preguntas.
  expect(text.indexOf('El descuento se acumula')).toBeLessThan(text.indexOf('## Preguntas abiertas'))
})

test('una pregunta nueva devuelve su número', () => {
  const { text, ids } = applyOps(CHANGE, [{ op: 'question_add', text: '¿En dólares?' }])
  expect(ids).toEqual(['P4'])
  expect(parseChange(text).questions.at(-1)).toEqual({ id: 'P4', text: '¿En dólares?' })
})

test('edita y quita puntos del What por su texto', () => {
  const { text } = applyOps(CHANGE, [
    { op: 'what_edit', point: 'Un código desconocido no cambia el total', text: 'Un código desconocido muestra "Cupón inválido"' },
    { op: 'what_remove', point: 'Un descuento del 10% sobre un total de $100 deja el total en $90', log: 'lo cubre otra parte' },
  ])
  expect(parseChange(text).what).toEqual(['Un código desconocido muestra "Cupón inválido"'])
  expect(text).toContain('**Cálculo**')
  expect(text).toContain('- **L2** What: se quitó "Un descuento del 10% sobre un total de $100 deja el total en $90": lo cubre otra parte\n')
  expect(() => applyOps(CHANGE, [{ op: 'what_edit', point: 'No existe', text: 'x' }])).toThrow('No existe')
})

test('agrega, edita, parte y reabre tareas sin correr los números', () => {
  const { text, ids } = applyOps(CHANGE, [
    { op: 'task_add', text: 'Mensaje de error' },
    { op: 'task_split', id: 'T2', into: ['Validar el formato', 'Buscar el código'] },
    { op: 'task_reopen', id: 'T1', log: 'el total sigue mal' },
  ])
  expect(ids).toEqual(['T3', 'T4'])
  expect(parseChange(text).tasks.map(t => `${t.id} ${t.text} ${t.done}`)).toEqual([
    'T1 Aplicar el descuento porcentual false',
    'T2 Validar el formato false',
    'T4 Buscar el código false',
    'T3 Mensaje de error false',
  ])
  expect(text).toContain('- **L2** T1 reabierta: el total sigue mal\n')
  // Una tarea hecha no se edita ni se parte: se reabre primero.
  expect(() => applyOps(CHANGE, [{ op: 'task_edit', id: 'T1', text: 'x' }])).toThrow('T1')
  expect(() => applyOps(CHANGE, [{ op: 'task_split', id: 'T1', into: ['a', 'b'] }])).toThrow('T1')
})

test('si una operación falla no se aplica ninguna', () => {
  expect(() => applyOps(CHANGE, [{ op: 'what_add', text: 'ok' }, { op: 'question_answer', id: 'P9', log: 'x' }])).toThrow('P9')
})

test('después de un rebase, los hashes de las tareas hechas se buscan por el mensaje del commit', () => {
  const text = completeTask(CHANGE, 'T2', 'ff00aa1')
  const moved: Record<string, string | null> = { a1b2c3d: '1111111', ff00aa1: null }
  const { text: synced, changed, missing } = resyncCommits(text, '2026-11-06', hash => moved[hash] ?? null)
  expect(parseChange(synced).tasks.map(t => t.commit)).toEqual(['1111111', 'ff00aa1'])
  expect(changed).toEqual(['T1'])
  expect(missing).toEqual(['T2'])
  expect(synced).toContain('- 2026-11-06: hashes actualizados tras un rebase: T1 a1b2c3d → 1111111. Sin encontrar: T2.\n')
})

test('el diagrama se agrega después de What, se reemplaza y se quita con texto vacío', () => {
  const added = applyOps(CHANGE, [{ op: 'diagram', text: 'flowchart LR\n  A --> B' }]).text
  expect(added).toContain('- Un código desconocido no cambia el total\n\n## Diagram\n\n```mermaid\nflowchart LR\n  A --> B\n```\n\n## Preguntas abiertas')
  const replaced = applyOps(added, [{ op: 'diagram', text: '```mermaid\nerDiagram\n  A ||--o{ B : x\n```' }]).text
  expect(replaced).toContain('## Diagram\n\n```mermaid\nerDiagram\n  A ||--o{ B : x\n```\n\n## Preguntas abiertas')
  expect(replaced).not.toContain('flowchart')
  expect(applyOps(replaced, [{ op: 'diagram', text: '' }]).text).toBe(CHANGE)
})

test('quitar una tarea pendiente la saca, anota por qué y no corre los números; una hecha no se quita', () => {
  const { text } = applyOps(CHANGE, [{ op: 'task_remove', id: 'T2', log: 'el botón va después' }, { op: 'task_add', text: 'Otra' }])
  expect(parseChange(text).tasks.map(t => t.id)).toEqual(['T1', 'T3'])
  expect(text).toContain('- **L2** T2 quitada (Validar el código): el botón va después\n')
  expect(() => applyOps(CHANGE, [{ op: 'task_remove', id: 'T1', log: 'x' }])).toThrow('T1')
})
