// Lo que seckert necesita de un tracker (GitHub Issues, Linear…). Cada adaptador
// guarda el issue canónico de lib/issue.ts y su estado a su manera.
import type { Issue, IssueState } from '../issue'

export type TrackedIssue = Issue & { id: string; url: string; state: IssueState | null }

export interface Tracker {
  create(issue: Issue, state: IssueState): TrackedIssue
  get(id: string): TrackedIssue
  // Sin estado: todos los issues de seckert abiertos.
  list(state?: IssueState): TrackedIssue[]
  // Solo mueve el estado; las reglas de transición las aplica quien llama.
  setState(id: string, from: IssueState | null, to: IssueState): void
}
