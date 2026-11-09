// Issues de seckert en GitHub: el repo sale del remoto `origin` y `gh` corre en la raíz.
import { execFileSync } from 'node:child_process'

import { similarIssues, answerQuestion, branchFor, checkTransition, openQuestionsProblem, takeProblem, type Issue, type IssueState, type Kind } from '../lib/issue'
import { ArtifactsUnavailable, githubTracker, type Gh } from '../lib/trackers/github'
import { issuePlan, syncIssue, type Plan } from './board'
import { baseBranch } from './repo'

// owner/repo de una URL de GitHub (ssh o https), o null si no es de GitHub.
export function parseRemote(url: string): string | null {
  const match = url.trim().match(/github\.com[:/]([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/)
  return match ? `${match[1]}/${match[2]}` : null
}

const NEEDS_GITHUB = 'Avisale al usuario: hace falta un origin en GitHub (git remote add origin …) y `gh auth login`.'

export function repoOf(root: string): string {
  let url: string
  try {
    url = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  } catch {
    throw new Error(`seckert usa los issues de GitHub y este repo no tiene remoto origin. ${NEEDS_GITHUB}`)
  }
  const repo = parseRemote(url)
  if (!repo) throw new Error(`seckert usa los issues de GitHub y origin no es un repo de GitHub (${url.trim()}). ${NEEDS_GITHUB}`)
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

export function tracker(root: string) {
  const gh = ghIn(root)
  const repo = repoOf(root)
  return { gh, repo, issues: githubTracker(repo, gh) }
}

// Un issue nuevo nace siempre en draft: aprobarlo es otro paso, con las palabras del usuario.
const DESIGN = 'Design'

// El link al diseño: el artifact link «Design», o la referencia «Design: <url>» sin artifacts.
export function designOf(issues: ReturnType<typeof tracker>['issues'], issue: { id: string; references?: string[] }): string | null {
  try {
    const link = issues.artifacts.list(issue.id, 'link').find(a => a.name === DESIGN)
    if (link) return link.body.trim()
  } catch (error) {
    if (!(error instanceof ArtifactsUnavailable)) throw error
  }
  return issue.references?.map(r => r.match(/^Design: (\S+)$/)?.[1]).find(Boolean) ?? null
}

// Crea el issue en draft. Con diseño, lo adjunta como artifact link «Design»; sin
// artifacts, lo agrega a References.
export function issueCreate(root: string, issue: Issue & Plan & { design?: string; parent?: string; blockedBy?: string[] }) {
  const { issues } = tracker(root)
  const { design, parent, blockedBy, priority, size, cycle, ...given } = issue
  // Sin origen, el pedido salió del chat: queda dicho, con la fecha de hoy.
  const rest = { ...given, origin: { ...given.origin, source: given.origin?.source?.trim() || 'chat', date: given.origin?.date?.trim() || new Date().toLocaleDateString('sv-SE') } }
  const similar = similarIssues(rest, issues.list()).map(({ id, title }) => ({ id, title }))
  let { rawBody: _raw, ...created } = issues.create(rest, 'draft', { parent, blockedBy })
  if (design?.trim()) {
    try {
      issues.artifacts.create(created.id, { type: 'link', name: DESIGN, body: design.trim() })
    } catch (error) {
      if (!(error instanceof ArtifactsUnavailable)) throw error
      const { id: _id, url: _url, title: _title, state: _state, kind: _kind, ...body } = created
      issues.updateBody(created.id, { ...body, references: [...(body.references ?? []), `Design: ${design.trim()}`] })
      ;({ rawBody: _raw, ...created } = issues.get(created.id))
    }
  }
  let board = syncIssue(root, created.id)
  if (!board && (priority || size || cycle)) {
    try {
      issuePlan(root, { id: created.id, priority, size, cycle })
    } catch (error) {
      board = `no se pudo planificar en el tablero: ${(error as Error).message}`
    }
  }
  return { ...created, design: design?.trim() || null, ...(board ? { board } : {}), ...(similar.length ? { similar } : {}) }
}

export function issueGet(root: string, id: string) {
  const { issues } = tracker(root)
  const { rawBody: _raw, ...issue } = issues.get(id)
  return { ...issue, design: designOf(issues, issue) }
}

export function issueList(root: string, state?: IssueState, kind?: Kind) {
  return tracker(root)
    .issues.list(state, kind)
    .map(({ id, title, state, route, kind, url }) => ({ id, title, state, route, kind, url }))
}

// Mueve el triage. Aprobar exige las palabras del usuario y las deja como comentario.
export function issueTransition(root: string, input: { id: string; to: 'approved' | 'discarded'; aprobacion?: string; motivo?: string }) {
  const { gh, repo, issues } = tracker(root)
  const current = issues.get(input.id)
  if (!current.state) throw new Error(`el issue #${input.id} no es de seckert (no tiene label seckert:*)`)
  const problem = checkTransition(current.state, input.to, input.aprobacion) ?? (input.to === 'approved' ? openQuestionsProblem(current) : null)
  if (problem) throw new Error(`el issue #${input.id} ${problem.startsWith('tiene') ? problem : `no se mueve: ${problem}`}`)
  issues.setState(input.id, current.state, input.to)
  const note =
    input.to === 'approved'
      ? `Aprobado por el usuario: «${input.aprobacion!.trim()}»`
      : `Descartado${input.motivo?.trim() ? `: ${input.motivo.trim()}` : ''}`
  gh(['issue', 'comment', input.id, '--repo', repo, '--body', note])
  const board = syncIssue(root, input.id)
  return { id: input.id, from: current.state, to: input.to, url: current.url, ...(board ? { board } : {}) }
}

function git(root: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

// Toma un issue para trabajarlo: crea su rama enlazada desde la base con
// `gh issue develop` (GitHub lo muestra in-progress) y se para en ella. Uno en
// curso se retoma en la rama que ya tiene.
export function issueTake(root: string, id: string, force = false) {
  const { gh, repo, issues } = tracker(root)
  const issue = issues.get(id)
  const problem = takeProblem(issue.state)
  if (problem) throw new Error(`el issue #${id} ${problem}`)
  // Una feature con sub-issues no se trabaja directo: se trabajan sus partes.
  if (issue.subIssues.length) {
    const parts = issue.subIssues.map(sub => ({
      id: sub.id,
      title: sub.title,
      open: sub.open,
      blockedBy: sub.open ? issues.get(sub.id).blockedBy.filter(b => b.open).map(b => b.id) : [],
    }))
    return { id, title: issue.title, parts, next: parts.find(p => p.open && !p.blockedBy.length)?.id ?? null, done: parts.every(p => !p.open) }
  }
  const blockers = issue.blockedBy.filter(b => b.open)
  if (blockers.length && !force)
    throw new Error(`el issue #${id} está bloqueado por ${blockers.map(b => `#${b.id} ${b.title}`).join(', ')}: decile al usuario qué falta y, si quiere seguir igual, llamá de nuevo con force: true`)
  if (git(root, 'status', '--porcelain')) throw new Error('hay cambios sin commitear: commitealos o guardalos antes de tomar el issue')

  let branch: string
  let how: 'creada' | 'ya existía'
  if (issue.state === 'in-progress') {
    branch = gh(['issue', 'develop', '--list', id, '--repo', repo]).trim().split('\n')[0]!.split('\t')[0]!
    let local = true
    try {
      git(root, 'show-ref', '--verify', '--quiet', `refs/heads/${branch}`)
    } catch {
      local = false
    }
    if (!local) git(root, 'fetch', '-q', 'origin', `${branch}:${branch}`)
    git(root, 'switch', '-q', branch)
    how = 'ya existía'
  } else {
    branch = branchFor(issue.title, issue.route)
    gh(['issue', 'develop', id, '--repo', repo, '--name', branch, '--base', baseBranch(root), '--checkout'])
    how = 'creada'
  }
  const { state: _state, rawBody: _raw, ...rest } = issue
  const board = syncIssue(root, id)
  return { ...rest, design: designOf(issues, issue), branch, how, ...(board ? { board } : {}) }
}

// Responde una pregunta abierta: la pasa a Decisions en el cuerpo y lo deja como comentario.
export function issueAnswer(root: string, input: { id: string; question: string; answer: string; decision?: string; by?: string }) {
  const { gh, repo, issues } = tracker(root)
  const current = issues.get(input.id)
  const { id: _id, url: _url, title: _title, state: _state, kind: _kind, rawBody: _raw, ...body } = current
  const date = new Date().toLocaleDateString('sv-SE')
  const next = answerQuestion(body, { ...input, date })
  issues.updateBody(input.id, next)
  const decision = next.decisions!.at(-1)!
  const who = input.by?.trim() ? ` por ${input.by.trim()}` : ''
  gh(['issue', 'comment', input.id, '--repo', repo, '--body', `${input.question} respondida${who}: «${input.answer.trim()}». Pasa a Decisions: ${decision.text}`])
  return { id: input.id, question: input.question, decision, pending: (next.questions ?? []).map(q => q.id) }
}

// Cierra una feature cuando todas sus partes (sub-issues) están cerradas.
export function issueClose(root: string, id: string) {
  const { gh, repo, issues } = tracker(root)
  const issue = issues.get(id)
  if (!issue.subIssues.length) throw new Error(`el issue #${id} no tiene sub-issues: se cierra con el merge de su PR (Fixes #${id})`)
  const open = issue.subIssues.filter(s => s.open)
  if (open.length) throw new Error(`el issue #${id} tiene partes abiertas: ${open.map(s => `#${s.id} ${s.title}`).join(', ')}`)
  const total = issue.subIssues.length
  gh(['issue', 'comment', id, '--repo', repo, '--body', `Todas las partes cerradas (${total} de ${total}).`])
  gh(['issue', 'close', id, '--repo', repo, '--reason', 'completed'])
  return { id, closed: true, parts: total, url: issue.url }
}

// Relaciones entre issues que ya existen: padre (sub-issue) y bloqueos nativos.
export function issueLink(root: string, input: { id: string; parent?: string; blockedBy?: string[]; removeBlockedBy?: string[] }) {
  const { gh, repo, issues } = tracker(root)
  const n = (v: string) => v.replace(/^#/, '')
  const args = [
    ...(input.blockedBy?.length ? ['--add-blocked-by', input.blockedBy.map(n).join(',')] : []),
    ...(input.removeBlockedBy?.length ? ['--remove-blocked-by', input.removeBlockedBy.map(n).join(',')] : []),
    ...(input.parent ? ['--parent', n(input.parent)] : []),
  ]
  if (!args.length) throw new Error('Pasá `parent`, `blockedBy` o `removeBlockedBy`.')
  gh(['issue', 'edit', n(input.id), '--repo', repo, ...args])
  const issue = issues.get(n(input.id))
  return { id: issue.id, parent: issue.parent, blockedBy: issue.blockedBy, url: issue.url }
}
