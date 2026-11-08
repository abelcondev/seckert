// El issue canónico de seckert: un pedido que termina en un PR.
// Vive en un tracker (GitHub Issues, Linear…); el cuerpo tiene secciones fijas
// para poder leerlo de vuelta, y el estado va aparte (en GitHub, una label).

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
  const origin = ORIGIN_KEYS.filter(([key]) => issue.origin[key]?.trim()).map(([key, label]) => `- ${label}: ${issue.origin[key]!.trim()}`)
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
    const [head, ...rest] = block.split('\n')
    map.set(head!.slice(3).trim(), rest.join('\n').trim())
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
  return { id: match[1]!, text: match[2]!.trim(), ...(match[3] ? { owner: match[3].trim() } : {}) }
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
