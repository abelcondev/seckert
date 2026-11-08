// Lo que seckert necesita de un tracker (GitHub Issues, Linear…). Cada adaptador
// guarda el issue canónico de lib/issue.ts y su estado a su manera.
import type { Issue, IssueBody, IssueState, Kind } from '../issue'

export type TrackedIssue = Omit<Issue, 'kind'> & { id: string; url: string; state: IssueState | null; kind: Kind | null; rawBody: string }

export type ArtifactType = 'plan' | 'link' | 'generic'
export type Artifact = { number: number; type: ArtifactType; name: string; body: string; url: string }

// Los adjuntos de un issue (issue artifacts), con historial de versiones en el tracker.
export interface Artifacts {
  list(id: string, type?: ArtifactType): Artifact[]
  create(id: string, artifact: { type: ArtifactType; name: string; body: string }): Artifact
  update(id: string, number: number, body: string): Artifact
}

export interface Tracker {
  artifacts: Artifacts
  create(issue: Issue, state: IssueState): TrackedIssue
  get(id: string): TrackedIssue
  // Sin estado: todos los issues de seckert abiertos.
  list(state?: IssueState, kind?: Kind): TrackedIssue[]
  // Reemplaza el cuerpo del issue (el título y el estado no cambian). Conserva un `## Plan` que haya.
  updateBody(id: string, issue: IssueBody): void
  // Reemplaza el cuerpo tal cual, para el plan en el body.
  updateRawBody(id: string, markdown: string): void
  addLabel(id: string, label: string, color: string): void
  // Los issues de seckert abiertos con una label dada.
  withLabel(label: string): TrackedIssue[]
  // Solo mueve el estado; las reglas de transición las aplica quien llama.
  setState(id: string, from: IssueState | null, to: IssueState): void
}
