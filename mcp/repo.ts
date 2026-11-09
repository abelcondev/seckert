// El repo del proyecto y sus changes, leídos del disco en cada llamada.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  addQuestion,
  appendLog,
  applyOps,
  type ChangeOp,
  resyncCommits,
  completeTask,
  failuresByPoint,
  parseChange,
  pointKey,
  renderChange,
  reopenTask,
  setBranch,
  setStatus,
  SLUG,
  slugOf,
  type NewChange,
  type ParsedChange,
  type Verdict,
  verifyLine,
} from '../lib/change'
import { removeRule, writeRule } from '../lib/spec'
import { createIssueChange, readIssueChanges, saveIssueChange, type IssueSource } from './issue-changes'

// Un change vive en su issue: `file` es «issue #n» y `source`, de dónde salió.
export type ChangeFile = ParsedChange & { slug: string; file: string; text: string; source: IssueSource }

// La raíz del repo, aunque Claude Code arranque el servidor en una subcarpeta.
export function projectRoot(): string {
  const start = process.env.CLAUDE_PROJECT_DIR || process.cwd()
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: start, encoding: 'utf8' }).trim()
  } catch {
    return start
  }
}

export function readChanges(root: string): ChangeFile[] {
  return readIssueChanges(root)
}

// El change por slug o, sin slug, el único approved. Si no se puede decidir, el
// error nombra los que hay para que Claude pregunte.
export function findChange(root: string, slug?: string): ChangeFile {
  const changes = readChanges(root)
  const open = changes.filter(change => change.status !== 'done')
  const names = open.map(change => `${change.slug} (${change.status})`).join(', ') || 'ninguno'

  if (slug) {
    const found = changes.find(change => change.slug === slug)
    if (!found) throw new Error(`No hay un change "${slug}". Abiertos: ${names}.`)
    return found
  }
  const approved = open.filter(change => change.status === 'approved')
  if (approved.length === 1) return approved[0]!
  throw new Error(
    approved.length === 0
      ? `No hay ningún change approved. Abiertos: ${names}.`
      : `Hay varios changes approved; indicá el slug. Abiertos: ${names}.`,
  )
}

export function summary(change: ChangeFile) {
  const pending = change.tasks.filter(task => !task.done)
  const next = pending[0]
  return {
    slug: change.slug,
    file: change.file,
    status: change.status,
    done: change.tasks.length - pending.length,
    total: change.tasks.length,
    next: next ? `${next.id} ${next.text}` : null,
    questions: change.questions.length,
    branch: change.branch,
    design: change.design,
    lastVerify: change.lastVerify,
  }
}

// El change estructurado y su texto entero (con el Log): lo lee el verificador.
export function detail(change: ChangeFile) {
  const { text, source: _source, ...parsed } = change
  return { ...parsed, text, failures: Object.fromEntries(failuresByPoint(text)) }
}

export function today(): string {
  return new Date().toLocaleDateString('sv-SE')
}

// Un change nuevo: el plan se adjunta a su issue. No pisa uno existente: una
// propuesta que se itera se edita, no se vuelve a crear.
export function createChange(root: string, change: NewChange): { slug: string; file: string; status: 'proposed' } {
  if (!change.issue?.trim()) throw new Error('Falta `issue`: el change vive en su issue. Creá o tomá el issue primero (issue_create, issue_take).')
  return createIssueChange(root, { ...change, issue: change.issue })
}

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

function save(root: string, change: ChangeFile, text: string): void {
  saveIssueChange(root, change, text)
}

// La base de las ramas de trabajo según detect-flow.sh, el mismo script que usan
// los hooks: develop (o dev) si hay gitflow, si no main.
export function flow(root: string): { main: string; develop: string | null } {
  const script = fileURLToPath(new URL('../../scripts/detect-flow.sh', import.meta.url))
  const out = execFileSync('sh', ['-c', '. "$1"; printf "%s\\n%s" "$SECKERT_DEVELOP" "$SECKERT_MAIN"', 'seckert', script], {
    cwd: root,
    encoding: 'utf8',
  })
  const [develop, main] = out.split('\n')
  return { main: main || 'main', develop: develop || null }
}

export function baseBranch(root: string): string {
  const { main, develop } = flow(root)
  return develop ?? main
}

// Se para en la rama del change; si no existe, la crea desde la base actualizada.
function checkoutBranch(root: string, branch: string): string {
  if (gitOk(root, 'show-ref', '--verify', '--quiet', `refs/heads/${branch}`)) {
    git(root, 'switch', '-q', branch)
    return 'ya existía'
  }
  const base = baseBranch(root)
  const remote = gitOk(root, 'show-ref', '--verify', '--quiet', `refs/remotes/origin/${base}`)
  if (remote) gitOk(root, 'fetch', '-q', 'origin', base)
  git(root, 'switch', '-q', '-c', branch, remote ? `origin/${base}` : base)
  return `desde ${base}`
}

export type Transition = { slug?: string; to: 'approved' | 'done'; aprobacion?: string; pendientes?: boolean }

// proposed → approved → done. Solo con las palabras del usuario; el módulo
// comprueba que sean de su último mensaje.
export function transitionChange(root: string, input: Transition): Record<string, unknown> {
  const words = input.aprobacion?.trim()
  if (!words) throw new Error('Falta `aprobacion`: las palabras textuales con las que el usuario aprobó o cerró. Solo el usuario aprueba y cierra.')

  const change = findChange(root, input.slug)
  const from = change.status
  const expected = input.to === 'approved' ? 'proposed' : 'approved'
  if (from !== expected) throw new Error(`${change.slug} está ${from}; solo se pasa a ${input.to} desde ${expected}.`)

  if (input.to === 'approved') {
    const open = change.questions.map(q => (q.id ? `${q.id} ${q.text}` : q.text))
    if (open.length && !input.pendientes)
      throw new Error(`Quedan preguntas abiertas: ${open.join(' | ')}. Nombralas y preguntá si sigue igual; si dice que sí, llamá de nuevo con pendientes: true.`)

    const branch = change.branch ?? `feature/${change.slug}`
    const how = checkoutBranch(root, branch)
    let text = setBranch(setStatus(change.text, 'approved'), branch)
    text = appendLog(text, `${today()}: aprobado ("${words}"). Rama ${branch} ${how}.`)
    if (open.length) text = appendLog(text, `${today()}: pendientes al aprobar: ${change.questions.map(q => q.id ?? q.text).join(', ')}.`)
    save(root, change, text)
    return { slug: change.slug, status: 'approved', branch, next: change.tasks.find(t => !t.done)?.id ?? null }
  }

  const pending = change.tasks.filter(task => !task.done).map(task => task.id)
  if (pending.length && !input.pendientes)
    throw new Error(`Quedan tareas sin hacer: ${pending.join(', ')}. Listalas y preguntá si cerrar igual; si dice que sí, llamá de nuevo con pendientes: true.`)
  const left = pending.length ? ` Quedó fuera: ${pending.join(', ')}.` : ''
  save(root, change, appendLog(setStatus(change.text, 'done'), `${today()}: cerrado ("${words}").${left}`))
  return { slug: change.slug, status: 'done', branch: change.branch, pendientes: pending }
}

// Marca una tarea solo si el commit existe y está en la rama actual.
export function completeTaskInRepo(root: string, input: { slug?: string; task: string; commit: string; evidencia: string }) {
  const change = findChange(root, input.slug)
  if (!gitOk(root, 'rev-parse', '--verify', '--quiet', `${input.commit}^{commit}`))
    throw new Error(`El commit ${input.commit} no existe. Commiteá la tarea antes de marcarla.`)
  if (!gitOk(root, 'merge-base', '--is-ancestor', input.commit, 'HEAD'))
    throw new Error(`El commit ${input.commit} no está en la rama actual.`)
  const hash = git(root, 'rev-parse', '--short=7', input.commit)
  const text = appendLog(completeTask(change.text, input.task, hash), `${today()}: ${input.task} hecha (${hash}). ${input.evidencia.trim()}`)
  save(root, change, text)
  const next = parseChange(text).tasks.find(task => !task.done)
  return { slug: change.slug, task: input.task, commit: hash, next: next ? `${next.id} ${next.text}` : null }
}

export type VerifyRow = { punto: string; veredicto: Verdict; evidencia?: string; tareas?: string[]; recomendacion?: string }
export type VerifyInput = { slug?: string; filas: VerifyRow[]; preexistentes?: string[]; comandos?: string[] }

// Lo visual contra el artifact, cuando no es un punto del What.
const DESIGN = 'Diseño'

// Registra una verificación: la línea verify con formato fijo, las tareas que
// se reabren y, al tercer fallo del mismo punto, una pregunta abierta en vez de
// reabrir. El conteo sale de las líneas verify anteriores del Log.
export function recordVerify(root: string, input: VerifyInput) {
  const change = findChange(root, input.slug)
  const what = new Set(change.what.map(pointKey))
  const unknown = input.filas.filter(row => pointKey(row.punto) !== DESIGN && !what.has(pointKey(row.punto)))
  if (unknown.length)
    throw new Error(
      `Estos puntos no están en el What: ${unknown.map(r => `"${r.punto}"`).join(', ')}. Nombralos igual que en el What: ${change.what.map(p => `"${p}"`).join(', ')}. Lo visual contra el diseño va como "${DESIGN}".`,
    )

  const before = failuresByPoint(change.text)
  const third: { punto: string; row: VerifyRow }[] = []
  const reopen = new Set<string>()
  for (const row of input.filas.filter(r => r.veredicto === 'FALLA')) {
    const key = pointKey(row.punto)
    if ((before.get(key) ?? 0) + 1 >= 3) third.push({ punto: key, row })
    else if (!row.tareas?.length) throw new Error(`"${row.punto}" falla: indicá en \`tareas\` qué tareas reabrir (p.ej. ["T1"]).`)
    else row.tareas.forEach(task => reopen.add(task))
  }

  let text = change.text
  for (const task of reopen) text = reopenTask(text, task)
  const questions: { punto: string; pregunta: string }[] = []
  for (const { punto, row } of third) {
    const rec = row.recomendacion?.trim() ? ` Recomendación: ${row.recomendacion.trim()}` : ''
    const added = addQuestion(text, `"${punto}" falló 3 veces: ¿cambiamos el enfoque?${rec}`)
    text = added.text
    questions.push({ punto, pregunta: added.id })
  }

  const line = verifyLine(today(), {
    rows: input.filas.map(row => ({ point: row.punto, verdict: row.veredicto, evidence: row.evidencia })),
    preexisting: input.preexistentes,
    commands: input.comandos,
  })
  const notes = [
    reopen.size ? `${[...reopen].join(', ')} reabierta${reopen.size > 1 ? 's' : ''}.` : '',
    ...questions.map(q => `"${q.punto}": 3.ª vez: no se reabre, queda en ${q.pregunta}.`),
  ].filter(Boolean)
  text = appendLog(text, [line, ...notes].join(' '))
  save(root, change, text)

  const failures = Object.fromEntries(failuresByPoint(text))
  return { slug: change.slug, linea: line, reabiertas: [...reopen], tercera_vez: questions, fallos: failures }
}

// change_update: todo lo que se edita de un change que no es status ni marcar
// tareas (eso es de change_transition y task_complete). Atómico: si una operación
// falla, no se escribe nada.
export function updateChange(
  root: string,
  input: { slug?: string; ops?: ChangeOp[]; resync_commits?: boolean },
): Record<string, unknown> {
  const change = findChange(root, input.slug)
  if (!input.ops?.length && !input.resync_commits) throw new Error('Pasá `ops`, `resync_commits` o los dos.')
  let { text, ids } = applyOps(change.text, input.ops ?? [])
  let resync: { changed: string[]; missing: string[] } | undefined
  if (input.resync_commits) {
    const range = `${git(root, 'merge-base', 'HEAD', baseBranch(root))}..HEAD`
    const onBranch = git(root, 'log', '--format=%h%x09%s', '--abbrev=7', range)
      .split('\n')
      .filter(Boolean)
      .map(line => line.split('\t') as [string, string])
    const result = resyncCommits(text, today(), hash => {
      if (onBranch.some(([h]) => h.startsWith(hash) || hash.startsWith(h))) return hash
      if (!gitOk(root, 'cat-file', '-e', `${hash}^{commit}`)) return null
      const subject = git(root, 'log', '-1', '--format=%s', hash)
      return onBranch.find(([, s]) => s === subject)?.[0] ?? null
    })
    text = result.text
    resync = { changed: result.changed, missing: result.missing }
  }
  save(root, change, text)
  return { slug: change.slug, file: change.file, ids, ...(resync ? { resync } : {}) }
}

export const SPECS_DIR = 'sdd/specs'

// spec_write: escribe, cambia o quita una regla de sdd/specs/<area>.md.
export function writeSpec(
  root: string,
  input: { area: string; title: string; body?: string; remove?: boolean; area_title?: string },
): Record<string, unknown> {
  if (!SLUG.test(input.area)) throw new Error(`El área "${input.area}" tiene que ser kebab-case, como el nombre del archivo en ${SPECS_DIR}.`)
  const file = `${SPECS_DIR}/${input.area}.md`
  const path = join(root, file)
  const before = existsSync(path) ? readFileSync(path, 'utf8') : null
  let text: string
  if (input.remove) {
    if (before === null) throw new Error(`No existe ${file}.`)
    text = removeRule(before, input.title)
  } else {
    if (!input.body?.trim()) throw new Error('Falta `body`: la regla tal como funciona hoy, sin historia.')
    text = writeRule(before, input.area, input.title, input.body, input.area_title)
  }
  mkdirSync(join(root, SPECS_DIR), { recursive: true })
  writeFileSync(path, text)
  return { file, rule: input.title, action: input.remove ? 'removed' : before?.includes(`\n## ${input.title.trim()}\n`) ? 'updated' : 'added' }
}
