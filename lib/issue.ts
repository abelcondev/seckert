// El issue canónico de seckert: lo que sale de una reunión y termina en un PR.
// Vive en un tracker (GitHub Issues, Linear…); el cuerpo tiene secciones fijas
// para poder leerlo de vuelta, y el estado va aparte (en GitHub, una label).

export const STATES = ['draft', 'approved', 'in-progress', 'in-review', 'closed', 'discarded'] as const
export type IssueState = (typeof STATES)[number]

export const ROUTES = ['FIX', 'SPEC', 'CHANGE'] as const
export type Route = (typeof ROUTES)[number]

export type Origin = { meeting?: string; date?: string; client?: string }

export type Issue = {
  title: string
  context: string
  quote?: string
  criteria: string[]
  route: Route
  origin: Origin
}

export type IssueBody = Omit<Issue, 'title'>

// La marca dice que el cuerpo es de seckert y qué versión del contrato sigue
// (docs/contrato-issue.md). Sin versión es la v1 de antes de versionarla.
export const CONTRACT_VERSION = 1
const MARK = `<!-- seckert:issue v${CONTRACT_VERSION} -->`
const MARK_RE = /<!-- seckert:issue(?: v(\d+))? -->/
const ORIGIN_KEYS: [keyof Origin, string][] = [
  ['meeting', 'Meeting'],
  ['date', 'Date'],
  ['client', 'Client'],
]

export function renderBody(issue: IssueBody): string {
  const context = [issue.context.trim(), ...(issue.quote?.trim() ? ['', `> ${issue.quote.trim()}`] : [])]
  const origin = ORIGIN_KEYS.filter(([key]) => issue.origin[key]).map(([key, label]) => `- ${label}: ${issue.origin[key]}`)
  return [
    MARK,
    '',
    '## Context',
    '',
    ...context,
    '',
    '## Acceptance criteria',
    '',
    ...issue.criteria.map(c => `- [ ] ${c.trim()}`),
    '',
    '## Route',
    '',
    issue.route,
    '',
    '## Origin',
    '',
    ...(origin.length ? origin : ['-']),
    '',
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

export function parseBody(body: string): IssueBody {
  const mark = body.match(MARK_RE)
  if (!mark) throw new Error('el issue no tiene el formato de seckert')
  const version = Number(mark[1] ?? 1)
  if (version > CONTRACT_VERSION) throw new Error(`el issue sigue el contrato v${version} y seckert conoce hasta v${CONTRACT_VERSION}: actualizá seckert`)
  const s = sections(body)
  const contextLines = (s.get('Context') ?? '').split('\n')
  const quoteLines = contextLines.filter(line => line.startsWith('> '))
  const context = contextLines.filter(line => !line.startsWith('> ')).join('\n').trim()
  const route = (s.get('Route') ?? '').trim()
  if (!ROUTES.includes(route as Route)) throw new Error(`ruta desconocida: "${route}"`)
  const criteria = (s.get('Acceptance criteria') ?? '')
    .split('\n')
    .map(line => line.match(/^- \[[ x]\] (.+)$/)?.[1])
    .filter((c): c is string => Boolean(c))
  const origin: Origin = {}
  for (const line of (s.get('Origin') ?? '').split('\n')) {
    for (const [key, label] of ORIGIN_KEYS) {
      const value = line.match(new RegExp(`^- ${label}: (.+)$`))?.[1]
      if (value) origin[key] = value.trim()
    }
  }
  return {
    context,
    ...(quoteLines.length ? { quote: quoteLines.map(line => line.slice(2)).join(' ').trim() } : {}),
    criteria,
    route: route as Route,
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
