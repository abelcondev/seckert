// Issues de seckert en GitHub: el repo sale del remoto `origin` y `gh` corre en la raíz.
import { execFileSync } from 'node:child_process'

import { checkTransition, type Issue, type IssueState } from '../lib/issue'
import { githubTracker, type Gh } from '../lib/trackers/github'

// owner/repo de una URL de GitHub (ssh o https), o null si no es de GitHub.
export function parseRemote(url: string): string | null {
  const match = url.trim().match(/github\.com[:/]([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/)
  return match ? `${match[1]}/${match[2]}` : null
}

export function repoOf(root: string): string {
  let url: string
  try {
    url = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  } catch {
    throw new Error('el repo no tiene remoto origin: los issues van al repo de GitHub de origin')
  }
  const repo = parseRemote(url)
  if (!repo) throw new Error(`origin no es un repo de GitHub: ${url.trim()}`)
  return repo
}

function ghIn(root: string): Gh {
  return (args, input) => {
    try {
      return execFileSync('gh', args, { cwd: root, encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'pipe'] })
    } catch (error) {
      const stderr = (error as { stderr?: string }).stderr?.trim()
      throw new Error(`gh ${args.slice(0, 2).join(' ')} falló${stderr ? `: ${stderr}` : ''}`)
    }
  }
}

function tracker(root: string) {
  const gh = ghIn(root)
  const repo = repoOf(root)
  return { gh, repo, issues: githubTracker(repo, gh) }
}

// Un issue nuevo nace siempre en draft: aprobarlo es otro paso, con las palabras del usuario.
export function issueCreate(root: string, issue: Issue) {
  return tracker(root).issues.create(issue, 'draft')
}

export function issueGet(root: string, id: string) {
  return tracker(root).issues.get(id)
}

export function issueList(root: string, state?: IssueState) {
  return tracker(root)
    .issues.list(state)
    .map(({ id, title, state, route, url }) => ({ id, title, state, route, url }))
}

// Mueve el triage. Aprobar exige las palabras del usuario y las deja como comentario.
export function issueTransition(root: string, input: { id: string; to: 'approved' | 'discarded'; aprobacion?: string; motivo?: string }) {
  const { gh, repo, issues } = tracker(root)
  const current = issues.get(input.id)
  if (!current.state) throw new Error(`el issue #${input.id} no es de seckert (no tiene label seckert:*)`)
  const problem = checkTransition(current.state, input.to, input.aprobacion)
  if (problem) throw new Error(problem)
  issues.setState(input.id, current.state, input.to)
  const note =
    input.to === 'approved'
      ? `Aprobado por el usuario: «${input.aprobacion!.trim()}»`
      : `Descartado${input.motivo?.trim() ? `: ${input.motivo.trim()}` : ''}`
  gh(['issue', 'comment', input.id, '--repo', repo, '--body', note])
  return { id: input.id, from: current.state, to: input.to, url: current.url }
}
