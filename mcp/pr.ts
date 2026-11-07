// pr_draft y release_draft: el cuerpo del PR y las notas de versión salen del
// change, del diff y de git log; Claude solo escribe lo que necesita juicio.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { section, verifyRows } from '../lib/change'
import { findChange, flow, readChanges } from './repo'

function git(root: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

function gitOk(root: string, ...args: string[]): boolean {
  try {
    git(root, ...args)
    return true
  } catch {
    return false
  }
}

const ref = (root: string, branch: string) => (gitOk(root, 'rev-parse', '--verify', '--quiet', `origin/${branch}`) ? `origin/${branch}` : branch)

// Archivos delicados del diff: dónde tiene que mirar quien revisa.
const DELICATE: [RegExp, string][] = [
  [/(^|\/)(migrations?|migrate)\/|\.sql$|schema\.prisma$/i, 'migración'],
  [/(^|\/)\.github\/workflows\//, 'CI'],
  [/auth|permission|(^|[/_.-])roles?([/_.-]|$)|polic(y|ies)/i, 'auth o permisos'],
  [/pay|billing|stripe|checkout|invoice|price|precio|cobro/i, 'pagos'],
  [/Dockerfile|docker-compose|vercel\.json|netlify\.toml|fly\.toml|eas\.json|terraform|k8s|deploy|(^|\/)\.env/i, 'despliegue'],
]
const SENSITIVE_TASK = /sensible|dinero|permis|datos|pago|auth|migraci/i

function risk(tasks: { id: string; text: string }[], files: string[]): string {
  const items = [
    ...tasks.filter(task => SENSITIVE_TASK.test(task.text)).map(task => `${task.id} ${task.text}`),
    ...files.flatMap(file => {
      const kind = DELICATE.find(([pattern]) => pattern.test(file))
      return kind ? [`${file} (${kind[1]})`] : []
    }),
  ]
  return items.length ? `Revisá con cuidado: ${items.join('; ')}.` : 'Sin lógica sensible: presentación y lógica de bajo riesgo.'
}

function evidence(lastVerify: string | null): string {
  if (!lastVerify) return 'Nunca se verificó.'
  const rows = verifyRows(lastVerify).map(row => `| ${row.point} | ${row.verdict} | ${row.detail ?? ''} |`)
  const pre = lastVerify.match(/PREEXISTENTE: (.+?)\.(?=\s+Comandos:|\s+T\d|\s+"|\s*$)/)?.[1]
  return [
    `Última verificación (${lastVerify.slice(0, 10)}):`,
    '',
    '| Punto | Veredicto | Evidencia |',
    '|---|---|---|',
    ...rows,
    '',
    pre ? `PREEXISTENTE: ${pre} (ya fallaba en la base; no lo causa este change).` : 'Sin tests `PREEXISTENTE`.',
  ].join('\n')
}

export function prDraft(root: string, input: { slug?: string }) {
  const change = findChange(root, input.slug)
  const branch = change.branch ?? git(root, 'rev-parse', '--abbrev-ref', 'HEAD')
  const { main, develop } = flow(root)
  const hotfix = branch.startsWith('hotfix/')
  const base = hotfix ? main : (develop ?? main)
  const mergeBase = git(root, 'merge-base', 'HEAD', ref(root, base))
  const files = git(root, 'diff', '--name-only', mergeBase, 'HEAD').split('\n').filter(Boolean).sort()

  const scope = change.specs[0] ?? change.slug
  const title = change.title ?? change.slug
  const type = hotfix || branch.startsWith('fix/') ? 'fix' : 'feat'
  const body = [
    '## Why',
    '',
    section(change.text, 'Why').trim(),
    '',
    '## What',
    '',
    section(change.text, 'What').trim(),
    '',
    ...(change.design ? [`Diseño: ${change.design}`, ''] : []),
    ...(section(change.text, 'Diagram').trim() ? ['## Diagram', '', section(change.text, 'Diagram').trim(), ''] : []),
    '## Testing',
    '',
    section(change.text, 'Testing').trim() || 'Sin sección de Testing en el change.',
    '',
    '## Risk',
    '',
    risk(change.tasks, files),
    '',
    '## How to revert',
    '',
    '<!-- seckert: completar -->',
    '',
    '## Evidence',
    '',
    evidence(change.lastVerify),
    '',
  ].join('\n')

  return {
    base,
    branch,
    title: `${type}(${scope}): ${title.charAt(0).toLowerCase()}${title.slice(1)}`,
    body,
    has_migration: files.some(file => DELICATE[0]![0].test(file)),
    files: files.length,
  }
}

const VERSION = /^\d+\.\d+\.\d+$/
const CONVENTIONAL = /^(\w+)(?:\([^)]*\))?(!)?: (.+)$/
const VERSION_FILES = ['package.json', 'app.json', '.claude-plugin/plugin.json', '.claude-plugin/marketplace.json', 'pyproject.toml', 'Cargo.toml']

export function releaseDraft(root: string, input: { version?: string }) {
  if (input.version && !VERSION.test(input.version)) throw new Error(`La versión "${input.version}" tiene que ser x.y.z.`)
  const lastTag = gitOk(root, 'describe', '--tags', '--abbrev=0') ? git(root, 'describe', '--tags', '--abbrev=0') : null
  const range = lastTag ? `${lastTag}..HEAD` : 'HEAD'
  const subjects = git(root, 'log', range, '--no-merges', '--format=%s').split('\n').filter(Boolean)
  const parsed = subjects.map(subject => subject.match(CONVENTIONAL)).filter(m => m !== null)
  const features = parsed.filter(m => m[1] === 'feat').map(m => m[3]!)
  const fixes = parsed.filter(m => m[1] === 'fix').map(m => m[3]!)
  const breaking = parsed.some(m => m[2] === '!') || subjects.some(s => s.includes('BREAKING'))

  const [major, minor, patch] = (lastTag?.replace(/^v/, '') ?? '0.0.0').split('.').map(Number) as [number, number, number]
  const proposed =
    breaking && major >= 1 ? `${major + 1}.0.0` : breaking || features.length ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`
  const version = input.version ?? proposed

  const touched = lastTag ? git(root, 'diff', '--name-only', lastTag, 'HEAD', '--', 'sdd/changes').split('\n') : null
  const changesDone = readChanges(root)
    .filter(change => change.status === 'done' && (!touched || touched.includes(change.file)))
    .map(change => ({ slug: change.slug, title: change.title }))

  const { main, develop } = flow(root)
  const notes = [
    ...(features.length ? ['## Features', '', ...features.map(f => `- ${f}`), ''] : []),
    ...(fixes.length ? ['## Fixes', '', ...fixes.map(f => `- ${f}`), ''] : []),
  ].join('\n')

  return {
    last_tag: lastTag,
    version,
    proposed,
    branch: `release/${version}`,
    from: develop ?? main,
    version_files: VERSION_FILES.filter(file => existsSync(join(root, file)) && /version/.test(readFileSync(join(root, file), 'utf8'))),
    notes: notes || 'Sin commits feat ni fix desde el último tag.',
    changes_done: changesDone,
    commits: subjects.length,
  }
}
