// El issue canónico de seckert: un pedido que termina en un PR.
// Vive en un tracker (GitHub Issues, Linear…); el cuerpo tiene secciones fijas
// para poder leerlo de vuelta, y el estado va aparte (en GitHub, una label).
import { must } from './must'

export const STATES = ['draft', 'approved', 'in-progress', 'in-review', 'closed', 'discarded'] as const
export type IssueState = (typeof STATES)[number]

export const ROUTES = ['FIX', 'SPEC', 'CHANGE'] as const
export type Route = (typeof ROUTES)[number]

// El origen: de dónde sale el pedido. En v1, `Meeting` es `source`.
export type Origin = { source?: string; date?: string; client?: string; requestedBy?: string }
export type Decision = { text: string; by?: string; date?: string }
export type Question = { id: string; text: string; owner?: string }

// El tipo del issue va como label `type:<kind>`, no en el cuerpo.
export const KINDS = ['feature', 'fix', 'task'] as const
export type Kind = (typeof KINDS)[number]

export type Issue = {
  title: string
  kind?: Kind
  problem: string
  quote?: string
  outcome: string
  criteria: string[]
  decisions?: Decision[]
  outOfScope?: string[]
  constraints?: string[]
  references?: string[]
  questions?: Question[]
  route: Route
  routeWhy?: string
  origin: Origin
}

export type IssueBody = Omit<Issue, 'title' | 'kind'>

// La marca dice que el cuerpo es de seckert y qué versión del contrato sigue
// (docs/contrato-issue.md). Sin versión es la v1 de antes de versionarla.
export const CONTRACT_VERSION = 2
const MARK = `<!-- seckert:issue v${CONTRACT_VERSION} -->`
const MARK_RE = /<!-- seckert:issue(?: v(\d+))? -->/
const ORIGIN_KEYS: [keyof Origin, string][] = [
  ['source', 'Source'],
  ['date', 'Date'],
  ['client', 'Client'],
  ['requestedBy', 'Requested by'],
]
const SEP = ' — '

const clean = (items?: string[]) => (items ?? []).map(item => item.trim()).filter(Boolean)
const section = (title: string, lines: string[]) => (lines.length ? [`## ${title}`, '', ...lines, ''] : [])
const bullets = (items?: string[]) => clean(items).map(item => `- ${item}`)

function decisionLine(d: Decision): string {
  const who = [d.by?.trim(), d.date?.trim()].filter(Boolean).join(', ')
  return `- ${d.text.trim()}${who ? SEP + who : ''}`
}

function questionLine(q: Question): string {
  return `- **${q.id}** ${q.text.trim()}${q.owner?.trim() ? `${SEP}decide: ${q.owner.trim()}` : ''}`
}

// Escribe el cuerpo v2. Las secciones opcionales vacías no se escriben.
export function renderBody(issue: IssueBody): string {
  if (!issue.problem?.trim()) throw new Error('falta Problem: qué pasa hoy y por qué importa')
  if (!issue.outcome?.trim()) throw new Error('falta Outcome: el resultado esperado')
  if (!clean(issue.criteria).length) throw new Error('falta al menos un criterio de aceptación')
  const problem = [issue.problem.trim(), ...(issue.quote?.trim() ? ['', `> ${issue.quote.trim()}`] : [])]
  const origin = ORIGIN_KEYS.flatMap(([key, label]) => {
    const value = issue.origin[key]?.trim()
    return value ? [`- ${label}: ${value}`] : []
  })
  return [
    MARK,
    '',
    ...section('Problem', problem),
    ...section('Outcome', [issue.outcome.trim()]),
    ...section('Acceptance criteria', clean(issue.criteria).map(c => `- [ ] ${c}`)),
    ...section('Decisions', (issue.decisions ?? []).filter(d => d.text.trim()).map(decisionLine)),
    ...section('Out of scope', bullets(issue.outOfScope)),
    ...section('Constraints', bullets(issue.constraints)),
    ...section('References', bullets(issue.references)),
    ...section('Open questions', (issue.questions ?? []).filter(q => q.text.trim()).map(questionLine)),
    ...section('Route', [issue.routeWhy?.trim() ? `${issue.route}: ${issue.routeWhy.trim()}` : issue.route]),
    ...section('Origin', origin.length ? origin : ['-']),
  ].join('\n')
}

function sections(body: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const block of body.split(/^(?=## )/m).slice(1)) {
    const [head = '', ...rest] = block.split('\n')
    map.set(head.slice(3).trim(), rest.join('\n').trim())
  }
  return map
}

const listOf = (text?: string) =>
  (text ?? '')
    .split('\n')
    .map(line => line.match(/^- (.+)$/)?.[1]?.trim())
    .filter((item): item is string => Boolean(item))

function parseDecision(line: string): Decision {
  const at = line.lastIndexOf(SEP)
  if (at === -1) return { text: line }
  const [by, date] = line.slice(at + SEP.length).split(',').map(part => part.trim())
  return { text: line.slice(0, at).trim(), ...(by ? { by } : {}), ...(date ? { date } : {}) }
}

function parseQuestion(line: string): Question | null {
  const match = line.match(/^\*\*(P\d+)\*\* (.+?)(?: — decide: (.+))?$/)
  if (!match) return null
  return { id: must(match[1], 'el id de la pregunta'), text: must(match[2], 'el texto de la pregunta').trim(), ...(match[3] ? { owner: match[3].trim() } : {}) }
}

// Lee un cuerpo v2, o uno v1 (Context en lugar de Problem, sin Outcome, Meeting en el origen).
export function parseBody(body: string): IssueBody {
  const mark = body.match(MARK_RE)
  if (!mark) throw new Error('el issue no tiene el formato de seckert')
  const version = Number(mark[1] ?? 1)
  if (version > CONTRACT_VERSION) throw new Error(`el issue sigue el contrato v${version} y seckert conoce hasta v${CONTRACT_VERSION}: actualizá seckert`)
  const s = sections(body)
  const problemLines = (s.get(version === 1 ? 'Context' : 'Problem') ?? '').split('\n')
  const quoteLines = problemLines.filter(line => line.startsWith('> '))
  const problem = problemLines.filter(line => !line.startsWith('> ')).join('\n').trim()
  const routeText = (s.get('Route') ?? '').trim()
  const routeMatch = routeText.match(/^(FIX|SPEC|CHANGE)\b(?::\s*([\s\S]+))?$/)
  if (!routeMatch) throw new Error(`ruta desconocida: "${routeText}"`)
  const criteria = (s.get('Acceptance criteria') ?? '')
    .split('\n')
    .map(line => line.match(/^- \[[ x]\] (.+)$/)?.[1])
    .filter((c): c is string => Boolean(c))
  const origin: Origin = {}
  const labels: [keyof Origin, string][] = version === 1 ? [['source', 'Meeting'], ...ORIGIN_KEYS.slice(1)] : ORIGIN_KEYS
  for (const line of (s.get('Origin') ?? '').split('\n')) {
    for (const [key, label] of labels) {
      const value = line.match(new RegExp(`^- ${label}: (.+)$`))?.[1]
      if (value) origin[key] = value.trim()
    }
  }
  const decisions = listOf(s.get('Decisions')).map(parseDecision)
  const outOfScope = listOf(s.get('Out of scope'))
  const constraints = listOf(s.get('Constraints'))
  const references = listOf(s.get('References'))
  const questions = listOf(s.get('Open questions')).map(parseQuestion).filter((q): q is Question => q !== null)
  return {
    problem,
    ...(quoteLines.length ? { quote: quoteLines.map(line => line.slice(2)).join(' ').trim() } : {}),
    outcome: (s.get('Outcome') ?? '').trim(),
    criteria,
    ...(decisions.length ? { decisions } : {}),
    ...(outOfScope.length ? { outOfScope } : {}),
    ...(constraints.length ? { constraints } : {}),
    ...(references.length ? { references } : {}),
    ...(questions.length ? { questions } : {}),
    route: routeMatch[1] as Route,
    ...(routeMatch[2]?.trim() ? { routeWhy: routeMatch[2].trim() } : {}),
    origin,
  }
}

// La label que dice que seckert espera una respuesta del usuario: un draft con
// preguntas abiertas o un change con el plan en `proposed`. Un issue cerrado o
// descartado ya no espera nada.
export const AWAITING_LABEL = 'seckert:awaiting'
export const AWAITING_COLOR = 'f9a825'

export function awaitingOf(input: { state: IssueState | null; questions?: Question[]; change?: 'proposed' | 'approved' | 'done' | null }): boolean {
  if (input.state === 'closed' || input.state === 'discarded') return false
  if (input.change === 'proposed') return true
  return input.state === 'draft' && (input.questions ?? []).length > 0
}

// Solo el triage es label propia; in-progress, in-review y closed los muestra GitHub.
export const TRIAGE = ['draft', 'approved', 'discarded'] as const
export type Triage = (typeof TRIAGE)[number]

const isTriage = (state: string): state is Triage => TRIAGE.includes(state as Triage)

const PREFIX = 'seckert:'

export function labelOf(state: Triage): string {
  return PREFIX + state
}

// El triage sale de las labels; sin label de seckert es null, con dos es un error.
export function stateOf(labels: string[]): Triage | null {
  const states = labels.filter(l => l.startsWith(PREFIX)).map(l => l.slice(PREFIX.length)).filter(isTriage)
  if (states.length > 1) throw new Error(`el issue tiene más de un estado: ${states.join(', ')}`)
  return states[0] ?? null
}

// Solo entran al flujo decisiones tomadas: con preguntas abiertas no se aprueba.
export function openQuestionsProblem(issue: Pick<IssueBody, 'questions'>): string | null {
  const open = issue.questions ?? []
  return open.length ? `tiene preguntas abiertas (${open.map(q => q.id).join(', ')}): respondelas antes de aprobarlo` : null
}

// Responde una pregunta: sale de Open questions y entra a Decisions con quién y cuándo.
export function answerQuestion(issue: IssueBody, input: { question: string; answer: string; decision?: string; by?: string; date: string }): IssueBody {
  const q = (issue.questions ?? []).find(item => item.id === input.question)
  if (!q) throw new Error(`no hay una pregunta abierta ${input.question}`)
  const text = input.decision?.trim() || `${q.text} ${input.answer.trim()}`
  const questions = (issue.questions ?? []).filter(item => item.id !== q.id)
  const decision: Decision = { text, ...(input.by?.trim() ? { by: input.by.trim() } : {}), date: input.date }
  const { questions: _drop, ...rest } = issue
  return { ...rest, decisions: [...(issue.decisions ?? []), decision], ...(questions.length ? { questions } : {}) }
}

// Las secciones de lista que issue_update edita, con su título en el cuerpo.
export const LIST_SECTIONS = {
  criteria: 'Acceptance criteria',
  decisions: 'Decisions',
  outOfScope: 'Out of scope',
  constraints: 'Constraints',
  references: 'References',
  questions: 'Open questions',
} as const
export type ListSection = keyof typeof LIST_SECTIONS
export const TEXT_SECTIONS = { problem: 'Problem', outcome: 'Outcome', quote: 'Problem (cita)' } as const
export type TextSection = keyof typeof TEXT_SECTIONS

export type IssueOp =
  | { op: 'set'; section: TextSection; text: string }
  | { op: 'add'; section: ListSection; text: string; by?: string; owner?: string }
  | { op: 'edit'; section: ListSection; item: string; text: string }
  | { op: 'remove'; section: ListSection; item: string }

const itemText = (item: string | Decision | Question) => (typeof item === 'string' ? item : item.text)

// Aplica ops a las secciones del cuerpo, en orden y todo o nada. Un ítem se
// nombra por su texto exacto (o por Pn en Open questions). Problem, Outcome y
// los criterios no pueden quedar vacíos. Una Pn nueva sigue a la mayor abierta o
// ya usada (`taken`: las respondidas). Devuelve el cuerpo y las Pn agregadas.
export function updateIssue(issue: IssueBody, ops: IssueOp[], ctx: { date: string; by?: string; taken?: string[] }): { body: IssueBody; added: string[] } {
  if (!ops.length) throw new Error('no hay cambios para aplicar')
  const next: IssueBody = structuredClone(issue)
  const added: string[] = []
  for (const op of ops) {
    if (op.op === 'set') {
      const text = op.text.trim()
      if (op.section === 'quote') {
        if (text) next.quote = text
        else delete next.quote
        continue
      }
      if (!text) throw new Error(`${TEXT_SECTIONS[op.section]} no puede quedar vacía`)
      next[op.section] = text
      continue
    }
    const title = LIST_SECTIONS[op.section]
    const list = [...((next[op.section] as (string | Decision | Question)[] | undefined) ?? [])]
    if (op.op === 'add') {
      const text = op.text.trim()
      if (!text) throw new Error(`el ítem nuevo de ${title} está vacío`)
      if (list.some(item => itemText(item) === text)) throw new Error(`${title} ya tiene «${text}»`)
      if (op.section === 'decisions') {
        const by = op.by?.trim() || ctx.by?.trim()
        list.push({ text, ...(by ? { by } : {}), date: ctx.date })
      } else if (op.section === 'questions') {
        const ids = [...list.map(q => (q as Question).id), ...(ctx.taken ?? [])]
        const max = Math.max(0, ...ids.map(id => Number(id.match(/^P(\d+)$/)?.[1] ?? 0)))
        const id = `P${max + 1}`
        list.push({ id, text, ...(op.owner?.trim() ? { owner: op.owner.trim() } : {}) })
        added.push(id)
      } else list.push(text)
    } else {
      const key = op.item.trim()
      const at = list.findIndex(item => itemText(item) === key || (op.section === 'questions' && (item as Question).id === key))
      if (at === -1) throw new Error(`${title} no tiene «${key}»`)
      if (op.op === 'edit') {
        const text = op.text.trim()
        if (!text) throw new Error(`para sacar «${key}» de ${title}, usá remove`)
        const item = must(list[at], `«${key}» en ${title}`)
        list[at] = typeof item === 'string' ? text : { ...item, text }
      } else list.splice(at, 1)
    }
    if (op.section === 'criteria' && !list.length) throw new Error(`${title} no puede quedar vacía: hace falta al menos un criterio`)
    if (list.length) (next as Record<string, unknown>)[op.section] = list
    else delete next[op.section]
  }
  return { body: next, added }
}

// El tipo vive en una label `type:<tipo>`; sin ella es null, con dos es un error.
export function kindLabel(kind: Kind): string {
  return `type:${kind}`
}

export function kindOf(labels: string[]): Kind | null {
  const kinds = labels.filter(l => l.startsWith('type:')).map(l => l.slice(5)).filter((k): k is Kind => KINDS.includes(k as Kind))
  if (kinds.length > 1) throw new Error(`el issue tiene más de un tipo: ${kinds.join(', ')}`)
  return kinds[0] ?? null
}

// La label de triage que corresponde a un estado (los que muestra GitHub vienen de un approved).
export function triageOf(state: IssueState): Triage {
  return isTriage(state) ? state : 'approved'
}

export type GithubFacts = { triage: Triage | null; closed: boolean; notPlanned: boolean; openPr: boolean; branch: boolean }

// El estado completo: el triage de la label más lo que muestra GitHub.
export function deriveState(f: GithubFacts): IssueState | null {
  if (!f.triage) return null
  if (f.closed) return f.notPlanned || f.triage === 'discarded' ? 'discarded' : 'closed'
  if (f.openPr) return 'in-review'
  if (f.branch) return 'in-progress'
  return f.triage
}

const HOW: Partial<Record<IssueState, string>> = {
  'in-progress': 'una rama enlazada al issue',
  'in-review': 'un PR enlazado abierto',
  closed: 'el merge de un PR con Fixes #n',
}

const NEXT: Record<IssueState, Triage[]> = {
  draft: ['approved', 'discarded'],
  approved: ['discarded'],
  'in-progress': ['discarded'],
  'in-review': [],
  closed: [],
  discarded: [],
}

// null si se puede; si no, por qué. A mano solo se mueve el triage, y aprobar
// exige las palabras del usuario.
export function checkTransition(from: IssueState, to: IssueState, approval?: string): string | null {
  if (!isTriage(to)) return `${to} no se marca a mano: lo muestra GitHub con ${HOW[to]}`
  if (!NEXT[from].includes(to)) {
    const options = NEXT[from].length ? NEXT[from].join(' o ') : 'ninguno a mano'
    return `de ${from} no se pasa a ${to} (desde ${from}: ${options})`
  }
  if (to === 'approved' && !approval?.trim()) return 'aprobar un issue necesita las palabras del usuario'
  return null
}

// La rama de trabajo de un issue: feature/ para un CHANGE (la misma que tendrá su
// change), fix/ para FIX y SPEC. El nombre sale del título, sin tildes y cortado.
export function branchFor(title: string, route: Route): string {
  const words = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
  let slug = ''
  for (const word of words) {
    const next = slug ? `${slug}-${word}` : word
    if (next.length > 36 && slug) break
    slug = next.slice(0, 36)
  }
  // Cortado, no termina en un conector suelto: "…-del" no dice nada.
  const cut = slug.length < words.join('-').length ? slug.replace(/(-(?:a|al|de|del|el|en|la|las|los|para|por|un|una|y|the|of|to|and|for|in))+$/, '') : slug
  return `${route === 'CHANGE' ? 'feature' : 'fix'}/${cut || 'issue'}`
}

// null si el issue se puede tomar; si no, por qué. Se toma uno aprobado o se
// retoma uno en curso.
export function takeProblem(state: IssueState | null): string | null {
  if (state === 'approved' || state === 'in-progress') return null
  if (state === null) return 'no es un issue de seckert (no tiene label seckert:*)'
  if (state === 'draft') return 'está en draft: hay que aprobarlo primero, con issue_transition y las palabras del usuario'
  return `está ${state}: solo se toma un issue approved o in-progress`
}

// Palabras con contenido de un texto: sin tildes, en minúsculas, de 4 letras o más y sin las más comunes.
const COMMON = new Set(['para', 'como', 'pero', 'cuando', 'entonces', 'desde', 'hasta', 'este', 'esta', 'esto', 'tiene', 'hace', 'with', 'that', 'this', 'from', 'when', 'then', 'there', 'have', 'agregar', 'cambiar', 'corregir', 'arreglar'])
function contentWords(text: string): Set<string> {
  return new Set(
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(w => w.length >= 4 && !COMMON.has(w)),
  )
}

// Los issues que se parecen a uno nuevo: comparten al menos dos palabras con contenido
// entre título y Problem. Sirve para no duplicar un issue que ya existe.
export function similarIssues<T extends { id: string; title: string; problem: string }>(issue: { title: string; problem: string }, open: T[]): T[] {
  const words = contentWords(`${issue.title} ${issue.problem}`)
  return open.filter(other => {
    const theirs = contentWords(`${other.title} ${other.problem}`)
    let shared = 0
    for (const w of words) if (theirs.has(w)) shared++
    return shared >= 2
  })
}
