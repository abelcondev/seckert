// Adaptador de GitHub Issues sobre `gh`. Solo el triage es label propia
// (`seckert:draft|approved|discarded`); in-progress, in-review y closed se leen
// de GitHub: rama enlazada, PR enlazado abierto e issue cerrado.
import { checkTransition, deriveState, kindLabel, kindOf, labelOf, parseBody, renderBody, stateOf, triageOf, type Issue, type IssueState, type Kind, type Triage } from '../issue'
import type { TrackedIssue, Tracker } from './tracker'

// Corre `gh` con los argumentos y, si hay, `input` por stdin; devuelve stdout.
// El real vive en el MCP: los tests del módulo no dejan a lib/ correr procesos.
export type Gh = (args: string[], input?: string) => string

const FIELDS = 'number,title,body,url,state,stateReason,labels,closedByPullRequestsReferences'

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
}

export function githubTracker(repo: string, gh: Gh): Tracker {
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
    return { id, url: raw.url, title: raw.title, state, kind, ...parseBody(raw.body) }
  }

  const get = (id: string) => toTracked(JSON.parse(gh(['issue', 'view', id, '--repo', repo, '--json', FIELDS])))

  return {
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
