// Changes que viven en su issue (modo `seckert issues: github`). El texto del
// change se arma desde el issue y su artifact plan (lib/issue-change.ts); al
// guardar, el plan vuelve al artifact (o al body, sin artifacts), los criterios
// editados vuelven al body y lo nuevo del Log queda como comentario. Una copia
// del texto queda en .git/seckert/changes para los hooks, que no llaman a gh.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { parseChange, renderChange, SLUG, type NewChange } from '../lib/change'
import { attachPlan, changeFromIssue, criteriaOf, logComment, newLogLines, PLAN_NAME, planFromChange, planInBody } from '../lib/issue-change'
import { ArtifactsUnavailable } from '../lib/trackers/github'
import type { Artifact, TrackedIssue } from '../lib/trackers/tracker'
import { tracker } from './issues'
import type { ChangeFile } from './repo'

export const CHANGE_LABEL = 'seckert:change'
const DESIGN_NAME = 'Design'

// El modo issues se activa con `seckert issues: github` en el AGENTS.md (o CLAUDE.md) del proyecto.
export function issuesMode(root: string): boolean {
  return ['AGENTS.md', 'CLAUDE.md'].some(name => {
    const path = join(root, name)
    return existsSync(path) && /^\s*(?:[-*]\s*)?`?seckert issues:\s*github`?\s*$/im.test(readFileSync(path, 'utf8'))
  })
}

export type IssueSource = { number: string; artifact: number | null; plan: string; criteria: string[] }

function cacheDir(root: string): string {
  const gitDir = execFileSync('git', ['rev-parse', '--git-dir'], { cwd: root, encoding: 'utf8' }).trim()
  return join(resolve(root, gitDir), 'seckert', 'changes')
}

function cache(root: string, slug: string, text: string): void {
  try {
    const dir = cacheDir(root)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, `${slug}.md`), text)
  } catch {
    // sin git o sin permisos: la copia es solo para los hooks
  }
}

function artifactsOf(id: string, issues: ReturnType<typeof tracker>['issues']): Artifact[] | null {
  try {
    return issues.artifacts.list(id)
  } catch (error) {
    if (error instanceof ArtifactsUnavailable) return null
    throw error
  }
}

const slugOfBranch = (branch: string | null) => branch?.split('/').slice(1).join('/') || null

function fromIssue(root: string, issue: TrackedIssue, artifacts: Artifact[] | null): ChangeFile | null {
  const planArtifact = artifacts?.find(a => a.type === 'plan' && a.name === PLAN_NAME) ?? null
  const plan = planArtifact?.body ?? planInBody(issue.rawBody)
  if (!plan) return null
  const design = artifacts?.find(a => a.type === 'link' && a.name === DESIGN_NAME)?.body.trim() || null
  const { rawBody: _raw, id: _id, url: _url, title, state: _state, kind: _kind, ...body } = issue
  const text = changeFromIssue({ title, body, plan, design })
  const parsed = parseChange(text)
  const slug = slugOfBranch(parsed.branch) ?? `issue-${issue.id}`
  cache(root, slug, text)
  return { ...parsed, slug, file: `issue #${issue.id}`, text, source: { number: issue.id, artifact: planArtifact?.number ?? null, plan, criteria: body.criteria } }
}

export function readIssueChanges(root: string): ChangeFile[] {
  const { issues } = tracker(root)
  return issues
    .withLabel(CHANGE_LABEL)
    .map(issue => fromIssue(root, issue, artifactsOf(issue.id, issues)))
    .filter((change): change is ChangeFile => change !== null)
}

// Un change nuevo con issue: el plan se adjunta al issue y no se escribe archivo.
export function createIssueChange(root: string, change: NewChange & { issue: string }): { slug: string; file: string; status: 'proposed' } {
  if (!SLUG.test(change.slug)) throw new Error(`El slug "${change.slug}" tiene que ser kebab-case: minúsculas, números y guiones.`)
  const { gh, repo, issues } = tracker(root)
  const id = change.issue.replace(/^#/, '')
  const issue = issues.get(id)
  const artifacts = artifactsOf(id, issues)
  if (fromIssue(root, issue, artifacts)) throw new Error(`El issue #${id} ya tiene un plan. Para ajustarlo, usá change_update.`)
  const plan = planFromChange(renderChange({ ...change, why: change.why || '-', what: change.what?.length ? change.what : ['-'], issue: id }))
  if (artifacts) issues.artifacts.create(id, { type: 'plan', name: PLAN_NAME, body: plan })
  else issues.updateRawBody(id, attachPlan(issue.rawBody, plan))
  issues.addLabel(id, CHANGE_LABEL, 'fbca04')
  gh(['issue', 'comment', id, '--repo', repo, '--body', `Plan propuesto${artifacts ? ' (artifact Plan)' : ' (sección Plan)'}: espera el «dale».`])
  cache(root, change.slug, changeFromIssue({ title: issue.title, body: issue, plan, design: null }))
  return { slug: change.slug, file: `issue #${id}`, status: 'proposed' }
}

// Guarda un change del issue: plan, criterios editados y lo nuevo del Log como comentario.
export function saveIssueChange(root: string, change: ChangeFile & { source: IssueSource }, text: string): void {
  const { gh, repo, issues } = tracker(root)
  const id = change.source.number
  const plan = planFromChange(text)
  const criteria = criteriaOf(text)
  if (JSON.stringify(criteria) !== JSON.stringify(change.source.criteria)) {
    const current = issues.get(id)
    const { rawBody: _raw, id: _id, url: _url, title: _title, state: _state, kind: _kind, ...body } = current
    issues.updateBody(id, { ...body, criteria })
  }
  if (plan !== change.source.plan) {
    if (change.source.artifact !== null) issues.artifacts.update(id, change.source.artifact, plan)
    else issues.updateRawBody(id, attachPlan(issues.get(id).rawBody, plan))
  }
  const added = newLogLines(change.source.plan, plan)
  if (added.length) gh(['issue', 'comment', id, '--repo', repo, '--body', logComment(added)])
  cache(root, change.slug, text)
}
