// El change que vive en un issue. Las herramientas trabajan sobre el mismo texto
// que un change de sdd/changes; acá se arma ese texto desde el issue y se separa
// de vuelta. El título y el qué salen del issue: título, Why (Problem, cita y
// Outcome) y What (los criterios). El resto es el plan, que vive en el artifact
// `plan` del issue: metadatos en un comentario HTML, diagrama, preguntas, tareas,
// testing y log. Solo funciones puras.
import { section } from './change'
import type { IssueBody } from './issue'

export const PLAN_NAME = 'Plan'
const META_FIELDS = ['status', 'specs', 'branch', 'issue'] as const
const META = /^<!-- seckert:plan\n([\s\S]*?)\n-->\n?/

// El commit de una tarea hecha se ve en GitHub junto a la casilla; el marcador
// oculto es el que lee el parser del change.
const VISIBLE_COMMIT = /\s·\s`[0-9a-f]{7,40}`(?=\s*<!--\s*commit:)/

function stripVisibleCommits(text: string): string {
  return text
    .split('\n')
    .map(line => line.replace(VISIBLE_COMMIT, ''))
    .join('\n')
}

function addVisibleCommits(text: string): string {
  return text
    .split('\n')
    .map(line => line.replace(/^(- \[x\] T\d+ .*?)\s*<!--\s*commit:\s*([0-9a-f]{7,40})\s*-->\s*$/, '$1 · `$2` <!-- commit: $2 -->'))
    .join('\n')
}

export type IssueChangeInput = { title: string; body: IssueBody; plan: string; design: string | null }

// El texto del change: frontmatter, título, Why y What desde el issue, y el resto desde el plan.
export function changeFromIssue({ title, body, plan, design }: IssueChangeInput): string {
  const meta = plan.match(META)
  if (!meta) throw new Error('el plan no tiene los metadatos de seckert')
  const rest = stripVisibleCommits(plan.slice(meta[0].length)).replace(/^\n+/, '')
  const why = [body.problem.trim(), ...(body.quote?.trim() ? ['', `> ${body.quote.trim()}`] : []), ...(body.outcome.trim() ? ['', body.outcome.trim()] : [])]
  return [
    '---',
    meta[1]!.trim(),
    `design: ${design ?? 'none'}`,
    '---',
    '',
    `# ${title.trim()}`,
    '',
    '## Why',
    '',
    ...why,
    '',
    '## What',
    '',
    ...body.criteria.map(c => `- ${c}`),
    '',
    rest,
  ].join('\n')
}

// El plan: el change sin frontmatter visible, título, Why ni What. El diseño no va:
// es el artifact `link` del issue.
export function planFromChange(text: string): string {
  const front = text.match(/^---\n([\s\S]*?)\n---\n/)
  if (!front) throw new Error('el change no tiene frontmatter')
  const fields = new Map(
    front[1]!
      .split('\n')
      .map(line => line.match(/^([a-z]+):[ \t]*(.*)$/))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map(m => [m[1]!, m[2]!.trim()] as const),
  )
  const meta = META_FIELDS.filter(name => fields.has(name)).map(name => `${name}: ${fields.get(name)}`)
  const body = text.slice(front[0].length)
  const kept = body.split(/^(?=## )/m).filter(block => !/^## (Why|What)[ \t]*$/m.test(block.split('\n')[0] ?? '') && block.startsWith('## '))
  return addVisibleCommits(['<!-- seckert:plan', ...meta, '-->', '', kept.join('').replace(/\s*$/, '\n')].join('\n'))
}

// Los criterios del issue tal como quedan en el What del change.
export function criteriaOf(text: string): string[] {
  return section(text, 'What')
    .split('\n')
    .filter(line => /^- \S/.test(line))
    .map(line => line.slice(2).trim())
}

const logLines = (text: string) =>
  section(text, 'Log')
    .split('\n')
    .filter(line => line.startsWith('- '))
    .map(line => line.slice(2).trim())

// Lo que se agregó al Log entre dos versiones del plan: va como comentario del issue.
export function newLogLines(before: string, after: string): string[] {
  const seen = new Set(logLines(before))
  return logLines(after).filter(line => !seen.has(line))
}

// Sin artifacts (son una preview de GitHub), el plan va al final del body, en
// `## Plan`, con sus títulos un nivel abajo para no cortar las secciones del issue.
const PLAN_SECTION = /\n## Plan\n[\s\S]*?(?=\n## (?!#)|$)/

export function attachPlan(body: string, plan: string): string {
  const without = body.replace(PLAN_SECTION, '').replace(/\s*$/, '')
  const demoted = plan.replace(/^## /gm, '### ').replace(/\s*$/, '')
  return `${without}\n\n## Plan\n\n${demoted}\n`
}

export function planInBody(body: string): string | null {
  const match = body.match(/\n## Plan\n\n([\s\S]*?)(?=\n## (?!#)|$)/)
  if (!match) return null
  return `${match[1]!.replace(/^### /gm, '## ').replace(/\s*$/, '')}\n`
}
