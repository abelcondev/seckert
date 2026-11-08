// Lo que seckert necesita de un tracker (GitHub Issues, Linear…). Cada adaptador
// guarda el issue canónico de lib/issue.ts y su estado a su manera.
import type { Issue, IssueBody, IssueState, Kind } from '../issue'

export type TrackedIssue = Omit<Issue, 'kind'> & { id: string; url: string; state: IssueState | null; kind: Kind | null }

export interface Tracker {
  create(issue: Issue, state: IssueState): TrackedIssue
  get(id: string): TrackedIssue
  // Sin estado: todos los issues de seckert abiertos.
  list(state?: IssueState, kind?: Kind): TrackedIssue[]
  // Reemplaza el cuerpo del issue (el título y el estado no cambian).
  updateBody(id: string, issue: IssueBody): void
  // Solo mueve el estado; las reglas de transición las aplica quien llama.
  setState(id: string, from: IssueState | null, to: IssueState): void
}
