// Leer y escribir un change de sdd/changes. Es el único lugar que conoce el
// formato: lo usan el servidor MCP, el módulo (la barra) y el contexto de inicio.
// Solo funciones puras sobre el texto del archivo; leer y escribir el disco es
// de quien llama.

export type Status = 'proposed' | 'approved' | 'done'
export type Verdict = 'PASA' | 'FALLA' | 'VISUAL' | 'NO VERIFICABLE'

export type Task = { id: string; text: string; done: boolean; commit: string | null }
export type Question = { id: string | null; text: string }

export type ParsedChange = {
  status: Status | null
  specs: string[]
  design: string | null
  branch: string | null
  // El número del issue de GitHub del que sale, sin #.
  issue: string | null
  title: string | null
  what: string[]
  tasks: Task[]
  questions: Question[]
  lastVerify: string | null
}

export type VerifyRecord = {
  rows: { point: string; verdict: Verdict; evidence?: string }[]
  preexisting?: string[]
  commands?: string[]
}

const PLACEHOLDER = /<[a-zñ ]+>/

// Un hueco de la plantilla (`<comportamiento>`), no un texto real que nombra algo
// entre <…> dentro de backticks, como `sdd/changes/<slug>.md`.
function isPlaceholder(text: string): boolean {
  return PLACEHOLDER.test(text.replace(/`[^`]*`/g, ''))
}

// La sección de preguntas: `## Open questions`; los changes viejos la tienen en castellano.
const QUESTIONS = '(?:Open questions|Preguntas abiertas)'

function field(text: string, name: string): string | null {
  const value = text.match(new RegExp(`^${name}:[ \\t]*(.+)$`, 'm'))?.[1]?.trim()
  return value && !isPlaceholder(value) ? value : null
}

// El cuerpo de una sección `## <name>`, hasta la siguiente `## `.
export function section(text: string, name: string): string {
  return text.split(new RegExp(`^## ${name}[ \\t]*$`, 'm'))[1]?.split(/^## /m)[0] ?? ''
}

function bullets(body: string): string[] {
  return body
    .split('\n')
    .filter(line => /^- \S/.test(line))
    .map(line => line.slice(2).trim())
}

// Un punto del What tal como se compara entre rondas: sin punto final ni espacios de más.
export function pointKey(point: string): string {
  return point.trim().replace(/[.\s]+$/, '')
}

const TASK = /^- \[([ x])\] (T\d+) (.*?)(?:\s*<!--\s*commit:\s*([^\s>]*)\s*-->)?\s*$/
const VERIFY = /^- \d{4}-\d{2}-\d{2} verify\b[^:]*:/

function parseTask(line: string): Task | null {
  const match = line.match(TASK)
  if (!match) return null
  const [, mark, id, text, commit] = match
  return { id: id!, text: text!.trim(), done: mark === 'x', commit: commit || null }
}

function parseQuestion(line: string): Question | null {
  if (isPlaceholder(line)) return null
  const match = line.match(/^\*\*(P\d+)\*\*\s+(.*)$/)
  return match ? { id: match[1]!, text: match[2]!.trim() } : { id: null, text: line }
}

function verifyLines(text: string): string[] {
  return section(text, 'Log')
    .split('\n')
    .filter(line => VERIFY.test(line))
}

// El slug de un archivo de sdd/changes: el nombre sin la fecha ni la extensión.
export function slugOf(name: string): string {
  return name.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '')
}

export function parseChange(text: string): ParsedChange {
  const status = field(text, 'status')
  const design = field(text, 'design')
  const specs = field(text, 'specs')
  const verify = verifyLines(text)

  return {
    status: status === 'proposed' || status === 'approved' || status === 'done' ? status : null,
    specs: specs ? specs.replace(/^\[|\]$/g, '').split(',').map(s => s.trim()).filter(Boolean) : [],
    design: design && design !== 'none' ? design : null,
    branch: field(text, 'branch'),
    issue: field(text, 'issue')?.replace(/^#/, '') ?? null,
    title: text.match(/^# (.+)$/m)?.[1]?.trim() ?? null,
    what: bullets(section(text, 'What')).filter(point => !isPlaceholder(point)),
    tasks: text.split('\n').map(parseTask).filter((task): task is Task => task !== null),
    questions: bullets(section(text, QUESTIONS))
      .map(parseQuestion)
      .filter((question): question is Question => question !== null),
    lastVerify: verify.at(-1)?.slice(2) ?? null,
  }
}

export type VerifyRow = { verdict: Verdict; point: string; detail: string | null }

// Las filas de una línea `verify:`, tal como las escribe verifyLine.
export function verifyRows(line: string): VerifyRow[] {
  // El punto y el detalle pueden tener comillas y paréntesis: cada fila termina en "; " o en el
  // ". " que cierra las filas, así que se corta ahí y no en la primera comilla.
  return [...line.matchAll(/(PASA|FALLA|VISUAL|NO VERIFICABLE) "(.+?)"(?: \((.*?)\))?(?=; (?:PASA|FALLA|VISUAL|NO VERIFICABLE) "|\.(?: |$))/g)].map(([, verdict, point, detail]) => ({
    verdict: verdict as Verdict,
    point: point!,
    detail: detail ?? null,
  }))
}

// Cuántas líneas `verify:` del Log dieron FALLA en cada punto del What.
export function failuresByPoint(text: string): Map<string, number> {
  const counts = new Map<string, number>()
  for (const line of verifyLines(text)) {
    const failed = new Set(verifyRows(line).filter(row => row.verdict === 'FALLA').map(row => pointKey(row.point)))
    for (const point of failed) counts.set(point, (counts.get(point) ?? 0) + 1)
  }
  return counts
}

function replaceField(text: string, name: string, value: string): string {
  const pattern = new RegExp(`^${name}:.*$`, 'm')
  if (!pattern.test(text)) throw new Error(`el change no tiene \`${name}:\``)
  return text.replace(pattern, `${name}: ${value}`)
}

export function setStatus(text: string, status: Status): string {
  return replaceField(text, 'status', status)
}

export function setBranch(text: string, branch: string): string {
  return replaceField(text, 'branch', branch)
}

function updateTask(text: string, id: string, update: (task: Task) => Task): string {
  let found = false
  const lines = text.split('\n').map(line => {
    const task = parseTask(line)
    if (task?.id !== id) return line
    found = true
    const next = update(task)
    return `- [${next.done ? 'x' : ' '}] ${next.id} ${next.text} <!-- commit:${next.commit ? ` ${next.commit}` : ''} -->`
  })
  if (!found) throw new Error(`no existe la tarea ${id}`)
  return lines.join('\n')
}

export function completeTask(text: string, id: string, commit: string): string {
  return updateTask(text, id, task => ({ ...task, done: true, commit }))
}

export function reopenTask(text: string, id: string): string {
  return updateTask(text, id, task => ({ ...task, done: false }))
}

export function appendLog(text: string, entry: string): string {
  return `${text.replace(/\s*$/, '')}\n- ${entry}\n`
}

// Las líneas de la sección de preguntas abiertas: [inicio, fin) del cuerpo.
function questionsRange(lines: string[]): [number, number] {
  const start = lines.findIndex(line => new RegExp(`^## ${QUESTIONS}[ \\t]*$`).test(line))
  if (start === -1) throw new Error('el change no tiene `## Open questions`')
  const end = lines.findIndex((line, index) => index > start && /^## /.test(line))
  return [start + 1, end === -1 ? lines.length : end]
}

// El número sigue al más alto que el change haya usado, también en el Log
// (una pregunta respondida no deja su número libre).
export function addQuestion(text: string, question: string): { text: string; id: string } {
  const used = [...text.matchAll(/\*\*P(\d+)\*\*|\bP(\d+)\b/g)].map(match => Number(match[1] ?? match[2]))
  const id = `P${Math.max(0, ...used) + 1}`
  const lines = text.split('\n')
  const [start, end] = questionsRange(lines)
  const body = lines.slice(start, end).filter(line => /^- \S/.test(line) && !isPlaceholder(line))
  const rebuilt = ['', ...body, `- **${id}** ${question}`, '']
  return { text: [...lines.slice(0, start), ...rebuilt, ...lines.slice(end)].join('\n'), id }
}

export function removeQuestion(text: string, id: string): string {
  const lines = text.split('\n')
  const [start, end] = questionsRange(lines)
  const index = lines.findIndex((line, i) => i >= start && i < end && line.startsWith(`- **${id}** `))
  if (index === -1) throw new Error(`no existe la pregunta ${id}`)
  return [...lines.slice(0, index), ...lines.slice(index + 1)].join('\n')
}

// Una línea numerada del Log (`**Ln** …`): el número sigue al más alto usado.
export function addLog(text: string, entry: string): string {
  const used = [...section(text, 'Log').matchAll(/\*\*L(\d+)\*\*/g)].map(match => Number(match[1]))
  return appendLog(text, `**L${Math.max(0, ...used) + 1}** ${entry}`)
}

// El rango [inicio, fin) de las líneas de una sección `## <name>`, sin la línea en blanco final.
function sectionRange(lines: string[], name: string): [number, number] {
  const start = lines.findIndex(line => new RegExp(`^## ${name}[ \\t]*$`).test(line))
  if (start === -1) throw new Error(`el change no tiene \`## ${name}\``)
  let end = lines.findIndex((line, index) => index > start && /^## /.test(line))
  if (end === -1) end = lines.length
  while (end > start + 1 && lines[end - 1]!.trim() === '') end--
  return [start + 1, end]
}

function insertAt(lines: string[], index: number, ...items: string[]): string[] {
  return [...lines.slice(0, index), ...items, ...lines.slice(index)]
}

function findPoint(lines: string[], point: string): number {
  const [start, end] = sectionRange(lines, 'What')
  const index = lines.findIndex((line, i) => i >= start && i < end && /^- \S/.test(line) && pointKey(line.slice(2)) === pointKey(point))
  if (index === -1) throw new Error(`el What no tiene el punto "${point}"`)
  return index
}

function editableTask(lines: string[], id: string): number {
  const index = lines.findIndex(line => parseTask(line)?.id === id)
  if (index === -1) throw new Error(`no existe la tarea ${id}`)
  if (parseTask(lines[index]!)!.done) throw new Error(`${id} está hecha: reabrila antes de cambiarla`)
  return index
}

// El número sigue al más alto usado, también en el Log: una tarea quitada no deja su número libre.
function nextTask(text: string): number {
  const tasks = text.split('\n').map(parseTask).filter(t => t !== null).map(t => Number(t!.id.slice(1)))
  const logged = [...section(text, 'Log').matchAll(/\bT(\d+)\b/g)].map(match => Number(match[1]))
  return Math.max(0, ...tasks, ...logged) + 1
}

const pending = (id: string, text: string) => `- [ ] ${id} ${text} <!-- commit: -->`

// `## Diagram` va justo después de What; texto vacío la quita.
function setDiagram(text: string, diagram: string): string {
  let lines = text.split('\n')
  const existing = lines.findIndex(line => /^## Diagram[ \t]*$/.test(line))
  if (existing !== -1) {
    let end = lines.findIndex((line, i) => i > existing && /^## /.test(line))
    if (end === -1) end = lines.length
    lines = [...lines.slice(0, existing), ...lines.slice(end)]
  }
  if (!diagram.trim()) return lines.join('\n')
  const at = sectionRange(lines, 'What')[1]
  return insertAt(lines, at, '', '## Diagram', '', mermaid(diagram)).join('\n')
}

export type ChangeOp =
  | { op: 'question_answer'; id: string; log: string }
  | { op: 'question_add'; text: string }
  | { op: 'what_add'; text: string }
  | { op: 'what_edit'; point: string; text: string }
  | { op: 'what_remove'; point: string; log: string }
  | { op: 'task_add'; text: string }
  | { op: 'task_edit'; id: string; text: string }
  | { op: 'task_split'; id: string; into: string[] }
  | { op: 'task_reopen'; id: string; log: string }
  | { op: 'task_remove'; id: string; log: string }
  | { op: 'log'; text: string }
  | { op: 'diagram'; text: string }

// Aplica las operaciones en orden; si una falla, lanza y no se escribe nada.
// `ids` son los números nuevos (Pn, Tn) en el orden en que se crearon.
export function applyOps(text: string, ops: ChangeOp[]): { text: string; ids: string[] } {
  const ids: string[] = []
  for (const op of ops) {
    let lines = text.split('\n')
    switch (op.op) {
      case 'question_answer':
        text = addLog(removeQuestion(text, op.id), `${op.id}: ${op.log}`)
        break
      case 'question_add': {
        const added = addQuestion(text, op.text)
        text = added.text
        ids.push(added.id)
        break
      }
      case 'what_add':
        text = insertAt(lines, sectionRange(lines, 'What')[1], `- ${op.text}`).join('\n')
        break
      case 'what_edit':
        lines[findPoint(lines, op.point)] = `- ${op.text}`
        text = lines.join('\n')
        break
      case 'what_remove': {
        const index = findPoint(lines, op.point)
        text = addLog([...lines.slice(0, index), ...lines.slice(index + 1)].join('\n'), `What: se quitó "${pointKey(op.point)}": ${op.log}`)
        break
      }
      case 'task_add': {
        const id = `T${nextTask(text)}`
        text = insertAt(lines, sectionRange(lines, 'Tasks')[1], pending(id, op.text)).join('\n')
        ids.push(id)
        break
      }
      case 'task_edit': {
        const index = editableTask(lines, op.id)
        lines[index] = pending(op.id, op.text)
        text = lines.join('\n')
        break
      }
      case 'task_split': {
        const index = editableTask(lines, op.id)
        if (op.into.length < 2) throw new Error(`partir ${op.id} necesita al menos dos tareas`)
        const first = nextTask(text)
        const rest = op.into.slice(1).map((part, i) => pending(`T${first + i}`, part))
        lines[index] = pending(op.id, op.into[0]!)
        text = insertAt(lines, index + 1, ...rest).join('\n')
        ids.push(...rest.map((_, i) => `T${first + i}`))
        break
      }
      case 'task_remove': {
        const index = editableTask(lines, op.id)
        const removed = parseTask(lines[index]!)!
        text = addLog([...lines.slice(0, index), ...lines.slice(index + 1)].join('\n'), `${op.id} quitada (${removed.text}): ${op.log}`)
        break
      }
      case 'task_reopen':
        text = addLog(reopenTask(text, op.id), `${op.id} reabierta: ${op.log}`)
        break
      case 'log':
        text = addLog(text, op.text)
        break
      case 'diagram':
        text = setDiagram(text, op.text)
        break
    }
  }
  return { text, ids }
}

// Después de un rebase los hashes de las tareas hechas ya no existen: `lookup`
// devuelve el nuevo (buscado por el mensaje del commit) o null si no lo encuentra.
export function resyncCommits(
  text: string,
  date: string,
  lookup: (hash: string) => string | null,
): { text: string; changed: string[]; missing: string[] } {
  const changed: string[] = []
  const missing: string[] = []
  const moves: string[] = []
  for (const task of parseChange(text).tasks.filter(t => t.done && t.commit)) {
    const next = lookup(task.commit!)
    if (next === null) missing.push(task.id)
    else if (next !== task.commit) {
      text = updateTask(text, task.id, t => ({ ...t, commit: next }))
      changed.push(task.id)
      moves.push(`${task.id} ${task.commit} → ${next}`)
    }
  }
  if (changed.length || missing.length) {
    const parts = [moves.length ? `: ${moves.join(', ')}` : ':', missing.length ? ` Sin encontrar: ${missing.join(', ')}.` : '']
    text = appendLog(text, `${date}: hashes actualizados tras un rebase${parts[0]}.${parts[1]}`.replace(':.', '.'))
  }
  return { text, changed, missing }
}

// La línea del Log de una verificación, sin el "- " inicial.
export function verifyLine(date: string, record: VerifyRecord): string {
  const rows = record.rows
    .map(row => {
      const detail = row.verdict === 'PASA' || !row.evidence ? '' : ` (${row.evidence})`
      return `${row.verdict} "${pointKey(row.point)}"${detail}`
    })
    .join('; ')
  const preexisting = record.preexisting?.length ? ` PREEXISTENTE: ${record.preexisting.join(', ')}.` : ''
  const commands = record.commands?.length ? ` Comandos: ${record.commands.map(c => `\`${c}\``).join(', ')}.` : ''
  return `${date} verify: ${rows}.${preexisting}${commands}`
}

export type NewChange = {
  slug: string
  title: string
  // Opcionales solo para un change que vive en su issue: el issue da Why y What.
  why?: string
  what?: string[]
  tasks: string[]
  questions?: string[]
  specs?: string[]
  design?: string | null
  // El número del issue del que sale: va al frontmatter como `issue: #n`.
  issue?: string
  // Mermaid, con o sin las cercas ```mermaid: va a `## Diagram`, después de What.
  diagram?: string
  testing?: { runner?: string; nivel?: string; logica?: string; presentacion?: string }
  // El pedido del usuario, verbatim: va a L1 sin editar.
  pedido: string
}

export const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/

// El diagrama siempre dentro de un único bloque ```mermaid, lo traiga o no.
function mermaid(diagram: string): string {
  const body = diagram.trim().replace(/^```(?:mermaid)?[ \t]*\n/, '').replace(/\n?```$/, '').trim()
  return ['```mermaid', body, '```'].join('\n')
}

// Un change nuevo con la forma de skills/workflow/template.md, en `proposed`.
export function renderChange(change: NewChange): string {
  const testing = change.testing ?? {}
  const list = (items: string[]) => items.map(item => `- ${item}`).join('\n')
  return [
    '---',
    'status: proposed',
    `specs: [${(change.specs ?? []).join(', ')}]`,
    `design: ${change.design || 'none'}`,
    `branch: feature/${change.slug}`,
    ...(change.issue?.trim() ? [`issue: #${change.issue.trim().replace(/^#/, '')}`] : []),
    '---',
    '',
    `# ${change.title}`,
    '',
    '## Why',
    '',
    (change.why ?? '').trim(),
    '',
    '## What',
    '',
    list(change.what ?? []),
    '',
    ...(change.diagram?.trim() ? ['## Diagram', '', mermaid(change.diagram), ''] : []),
    '## Open questions',
    '',
    ...(change.questions?.length ? [change.questions.map((q, i) => `- **P${i + 1}** ${q}`).join('\n'), ''] : []),
    '## Tasks',
    '',
    change.tasks.map((task, i) => `- [ ] T${i + 1} ${task} <!-- commit: -->`).join('\n'),
    '',
    '## Testing',
    '',
    `- Runner: ${testing.runner ?? 'por definir'}`,
    `- Nivel: ${testing.nivel ?? 'risk'}`,
    `- Lógica: ${testing.logica ?? 'por definir'}`,
    `- Presentación: ${testing.presentacion ?? 'por definir'}`,
    '',
    '## Log',
    '',
    `- **L1** (pedido original, verbatim): ${change.pedido}`,
    '',
  ].join('\n')
}
