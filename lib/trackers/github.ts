// Adaptador de GitHub Issues sobre `gh`. Solo el triage es label propia
// (`seckert:draft|approved|discarded`); in-progress, in-review y closed se leen
// de GitHub: rama enlazada, PR enlazado abierto e issue cerrado.
import { checkTransition, deriveState, kindLabel, kindOf, labelOf, parseBody, renderBody, stateOf, triageOf, type Issue, type IssueBody, type IssueState, type Kind, type Triage } from '../issue'
import { attachPlan, planInBody } from '../issue-change'
import type { Artifact, Artifacts, ArtifactType, Related, TrackedIssue, Tracker } from './tracker'

// Corre `gh` con los argumentos y, si hay, `input` por stdin; devuelve stdout.
// El real vive en el MCP: los tests del módulo no dejan a lib/ correr procesos.
export type Gh = (args: string[], input?: string) => string

const FIELDS = 'number,title,body,url,state,stateReason,labels,closedByPullRequestsReferences,parent,subIssues,blockedBy'

const KIND_COLORS: Record<Kind, string> = { feature: 'a2eeef', fix: 'd73a4a', task: 'ededed' }

const COLORS: Record<Triage, string> = {
  draft: 'd4c5f9',
  approved: '0e8a16',
  discarded: 'cccccc',
}

type Raw = {
  number: number
  title: string
  body: string
  url: string
  state: string
  stateReason?: string
  labels: { name: string }[]
  closedByPullRequestsReferences?: unknown[]
  parent?: { number: number } | null
  subIssues?: { nodes: RawRelated[] }
  blockedBy?: { nodes: RawRelated[] }
}

type RawRelated = { number: number; state: string; title: string }
const related = (nodes?: RawRelated[]): Related[] => (nodes ?? []).map(n => ({ id: String(n.number), open: n.state !== 'CLOSED', title: n.title }))

// La API de issue artifacts es una preview: si el repo no la tiene, se usa el plan en el body.
export class ArtifactsUnavailable extends Error {
  constructor(detail: string) {
    super(`los issue artifacts no están disponibles para este repo (${detail})`)
  }
}

const API_VERSION = ['-H', 'X-GitHub-Api-Version: 2026-03-10']

type RawArtifact = { number: number; type: ArtifactType; name: string; body: string; html_url: string }
const toArtifact = (raw: RawArtifact): Artifact => ({ number: raw.number, type: raw.type, name: raw.name, body: raw.body, url: raw.html_url })

export function githubTracker(repo: string, gh: Gh): Tracker {
  const api = (args: string[], input?: string) => {
    try {
      return gh(['api', ...API_VERSION, ...args], input)
    } catch (error) {
      const message = (error as Error).message
      if (/HTTP 404|HTTP 410/.test(message)) throw new ArtifactsUnavailable(message)
      throw error
    }
  }
  const base = (id: string) => `repos/${repo}/issues/${id}/artifacts`
  const artifacts: Artifacts = {
    list: (id, type) => (JSON.parse(api([`${base(id)}${type ? `?type=${type}` : ''}`]) || '[]') as RawArtifact[]).map(toArtifact),
    create: (id, artifact) => toArtifact(JSON.parse(api(['-X', 'POST', base(id), '--input', '-'], JSON.stringify(artifact)))),
    update: (id, number, body) => toArtifact(JSON.parse(api(['-X', 'PATCH', `${base(id)}/${number}`, '--input', '-'], JSON.stringify({ body })))),
  }

  const ensureLabel = (state: Triage) => gh(['label', 'create', labelOf(state), '--repo', repo, '--force', '--color', COLORS[state]])

  // La rama enlazada solo importa en un aprobado abierto sin PR: evita una llamada por issue.
  const hasBranch = (id: string) => gh(['issue', 'develop', '--list', id, '--repo', repo]).trim() !== ''

  const toTracked = (raw: Raw): TrackedIssue => {
    const triage = stateOf(raw.labels.map(l => l.name))
    const closed = raw.state === 'CLOSED'
    const openPr = (raw.closedByPullRequestsReferences ?? []).length > 0
    const id = String(raw.number)
    const branch = triage === 'approved' && !closed && !openPr && hasBranch(id)
    const state = deriveState({ triage, closed, notPlanned: raw.stateReason === 'NOT_PLANNED', openPr, branch })
    const kind = kindOf(raw.labels.map(l => l.name))
    return {
      id,
      url: raw.url,
      title: raw.title,
      state,
      kind,
      rawBody: raw.body,
      parent: raw.parent ? String(raw.parent.number) : null,
      subIssues: related(raw.subIssues?.nodes),
      blockedBy: related(raw.blockedBy?.nodes),
      ...parseBody(raw.body),
    }
  }

  const get = (id: string) => toTracked(JSON.parse(gh(['issue', 'view', id, '--repo', repo, '--json', FIELDS])))

  return {
    artifacts,

    create(issue: Issue, state: IssueState) {
      if (state !== 'draft' && state !== 'approved') throw new Error(`un issue nuevo nace en draft o approved, no en ${state}`)
      ensureLabel(state)
      const labels = ['--label', labelOf(state)]
      if (issue.kind) {
        gh(['label', 'create', kindLabel(issue.kind), '--repo', repo, '--force', '--color', KIND_COLORS[issue.kind]])
        labels.push('--label', kindLabel(issue.kind))
      }
      const url = gh(['issue', 'create', '--repo', repo, '--title', issue.title, '--body-file', '-', ...labels], renderBody(issue)).trim()
      const number = url.match(/\/issues\/(\d+)$/)?.[1]
      if (!number) throw new Error(`gh no devolvió la URL del issue: ${url}`)
      return get(number)
    },

    get,

    // Sin estado: los abiertos. Con estado: todos, filtrados por el estado leído.
    list(state?: IssueState, kind?: Kind) {
      const args = ['issue', 'list', '--repo', repo, '--json', FIELDS, '--limit', '200', '--state', state ? 'all' : 'open']
      if (state) args.push('--label', labelOf(triageOf(state)))
      if (kind) args.push('--label', kindLabel(kind))
      const raws: Raw[] = JSON.parse(gh(args) || '[]')
      return raws.flatMap(raw => {
        if (!stateOf(raw.labels.map(l => l.name))) return []
        try {
          const issue = toTracked(raw)
          return !state || issue.state === state ? [issue] : []
        } catch {
          return [] // cuerpo editado a mano: no es un issue de seckert legible
        }
      })
    },

    updateBody(id: string, issue: IssueBody) {
      const plan = planInBody(get(id).rawBody)
      const body = renderBody(issue)
      gh(['issue', 'edit', id, '--repo', repo, '--body-file', '-'], plan ? attachPlan(body, plan) : body)
    },

    updateRawBody(id: string, markdown: string) {
      gh(['issue', 'edit', id, '--repo', repo, '--body-file', '-'], markdown)
    },

    addLabel(id: string, label: string, color: string) {
      gh(['label', 'create', label, '--repo', repo, '--force', '--color', color])
      gh(['issue', 'edit', id, '--repo', repo, '--add-label', label])
    },

    withLabel(label: string) {
      const raws: Raw[] = JSON.parse(gh(['issue', 'list', '--repo', repo, '--json', FIELDS, '--limit', '200', '--state', 'open', '--label', label]) || '[]')
      return raws.flatMap(raw => {
        try {
          return [toTracked(raw)]
        } catch {
          return []
        }
      })
    },

    setState(id: string, from: IssueState | null, to: IssueState) {
      if (to !== 'draft' && to !== 'approved' && to !== 'discarded') throw new Error(checkTransition(from ?? 'draft', to)!)
      ensureLabel(to)
      const args = ['issue', 'edit', id, '--repo', repo]
      if (from) args.push('--remove-label', labelOf(triageOf(from)))
      gh([...args, '--add-label', labelOf(to)])
      if (to === 'discarded') gh(['issue', 'close', id, '--repo', repo, '--reason', 'not planned'])
    },
  }
}
