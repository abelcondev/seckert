import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { manualEditProblem, parseChange, slugOf } from '../lib/change'
import type { Change, Snapshot } from '../types'
import { compact, shouldCompact } from './compact'

const CHANGES_DIR = 'sdd/changes'
// Los changes que viven en su issue: el servidor MCP deja una copia acá (no se sube al repo).
const ISSUE_CHANGES_DIR = '.git/seckert/changes'
const EMPTY: Snapshot = { changes: [], branch: null }

const snapshot = atom({ plugin: 'seckert', key: 'snapshot' } as const, EMPTY)

function plural(count: number): string {
  return count === 1 ? '1 pregunta abierta' : `${count} preguntas abiertas`
}

// Un change abierto, para la barra y el contexto. La lectura es la de lib/change.ts,
// la misma que usa el servidor MCP.
function toChange(name: string, text: string, mtimeMs: number): Change | null {
  const parsed = parseChange(text)
  if (parsed.status !== 'proposed' && parsed.status !== 'approved') return null
  const next = parsed.tasks.find(task => !task.done)
  return {
    questions: parsed.questions.length,
    slug: slugOf(name),
    status: parsed.status,
    done: parsed.tasks.filter(task => task.done).length,
    total: parsed.tasks.length,
    next: next ? `${next.id} ${next.text}` : null,
    branch: parsed.branch,
    mtimeMs,
  }
}

type Repo = { root: string | null; branch: string | null }

// La raíz del repo y la rama, con un solo git. La raíz hace que sdd/changes se
// encuentre aunque la terminal esté parada en una subcarpeta.
async function repo($: EngineInterface): Promise<Repo> {
  try {
    const { exitCode, stdout } = await $.process.run(
      ['git', 'rev-parse', '--show-toplevel', '--abbrev-ref', 'HEAD'],
      { timeoutMs: 3000 },
    )
    if (exitCode !== 0) return { root: null, branch: null }
    const [root, branch] = stdout.trim().split('\n')
    return { root: root || null, branch: branch && branch !== 'HEAD' ? branch : null }
  } catch {
    return { root: null, branch: null }
  }
}

// Nunca falla: si algo no se puede leer, la barra y el contexto se quedan como estaban.
async function refresh($: EngineInterface): Promise<void> {
  try {
    await load($)
  } catch {
    // sin cambios
  }
}

async function load($: EngineInterface): Promise<void> {
  const { root, branch } = await repo($)
  let changes: Change[] = []

  for (const name of [CHANGES_DIR, ISSUE_CHANGES_DIR]) {
    const dir = root ? `${root}/${name}` : name
    if (!(await $.fs.exists(dir))) continue
    const entries = await $.fs.list(dir)
    const files = entries.filter(entry => entry.kind === 'file' && entry.name.endsWith('.md'))
    const parsed = await Promise.all(
      files.map(async entry => toChange(entry.name, await $.fs.read(`${dir}/${entry.name}`), entry.mtimeMs)),
    )
    changes.push(...parsed.filter((change): change is Change => change !== null))
  }

  await update($, snapshot, () => ({ changes, branch }))
}

// El título de la tarea, sin el detalle que sigue a ":" o " — ".
function shortTask(task: string): string {
  const title = task.split(/: | — | - /)[0] ?? task
  return title.length > 40 ? `${title.slice(0, 39)}…` : title
}

// El change en el que se está trabajando: el de la rama actual, si no el
// último que se tocó. Un change aprobado a medias no le gana a uno más nuevo:
// si se pasó a otro (urgente), la barra muestra ese.
function active({ changes, branch }: Snapshot): Change | null {
  const byRecent = [...changes].sort((a, b) => b.mtimeMs - a.mtimeMs)
  return byRecent.find(change => branch !== null && change.branch === branch) ?? byRecent[0] ?? null
}

// Orígenes de un mensaje escrito por el usuario.
const HUMAN = new Set(['composer', 'bridge', 'sdk'])

// Para comparar palabras sin que importen mayúsculas, tildes ni puntuación.
function words(text: string): string {
  return ` ${text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim()} `
}

// change_transition del servidor MCP de seckert (mcp__plugin_seckert_seckert__change_transition).
const TRANSITION = 'mcp__plugin_seckert_seckert__change_transition'

// Solo el usuario aprueba y cierra: las palabras que el modelo pasa como
// `aprobacion` tienen que estar en el último mensaje que el usuario escribió.
export function approvalProblem(aprobacion: unknown, lastPrompt: string | null): string | null {
  const said = typeof aprobacion === 'string' ? words(aprobacion) : ' '
  if (said.trim() === '') return 'falta `aprobacion` con las palabras del usuario'
  if (lastPrompt === null || !words(lastPrompt).includes(said))
    return `"${String(aprobacion).trim()}" no está en el último mensaje del usuario`
  return null
}

function contextText(state: Snapshot): string {
  const lines = state.changes.map(change => {
    const progress = change.status === 'proposed' ? 'esperando el "sí" del usuario' : `${change.done}/${change.total} tareas`
    const next = change.status === 'approved' && change.next ? `; siguiente: ${change.next}` : ''
    const questions = change.questions > 0 ? `; ${plural(change.questions)}` : ''
    return `- ${change.slug} (${change.status}, ${progress}${next}${questions}${change.branch ? `; rama ${change.branch}` : ''})`
  })
  const current = active(state)

  return [
    'seckert: changes abiertos en sdd/changes (leído del disco ahora; manda sobre lo que recuerdes):',
    ...lines,
    state.branch ? `Rama actual: ${state.branch}.` : '',
    current ? `Si el usuario dice "seguí" o aprueba sin nombrar uno, se refiere a ${current.slug}.` : '',
    'Los pedidos de trabajo nuevos van a un issue de GitHub; lo que no está claro se discute en la sesión.',
  ]
    .filter(Boolean)
    .join('\n')
}

export const register: Register = on => {
  // Status y tareas marcadas solo cambian por las herramientas del MCP: llevan
  // las palabras del usuario y el commit. El resto de un change se puede editar
  // a mano si change_update no alcanza.
  const isChange = (path: string) => /(^|\/)sdd\/changes\/[^/]+\.md$/.test(path)
  const guard = (problem: string) => ({ deny: `seckert: ${problem}. No edites esa línea a mano.` })

  // Lo último que Claude recibió; un /clear o una recarga lo olvidan y se reenvía.
  let lastSent: string | null = null
  // El último mensaje que escribió el usuario: contra él se comprueba una aprobación.
  let lastPrompt: string | null = null

  // El hook de shell SessionStart ya listó los changes abiertos: no se repiten
  // en el primer mensaje, solo cuando cambien.
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    await refresh($)
    const state = await read($, snapshot)
    lastSent = state.changes.length > 0 ? contextText(state) : null
    return started
  })

  // El contexto viaja junto al mensaje del usuario (no en el prompt de sistema,
  // que una política de organización puede reservar) y solo cuando cambió.
  on('prompt.submit', async ($, e, next) => {
    // Solo lo que escribe una persona: terminal, Remote Control o `claude -p`.
    // Los avisos de tareas en segundo plano y otros orígenes no cuentan.
    if (!e.isMeta && HUMAN.has(e.origin?.kind ?? '')) lastPrompt = e.text
    await refresh($)
    if (e.command || e.isMeta) return next(e)

    const state = await read($, snapshot)
    const text = state.changes.length > 0 ? contextText(state) : null
    if (text === lastSent) return next(e)

    lastSent = text
    const note = text ?? 'seckert: ya no hay changes abiertos en sdd/changes.'
    return next({ ...e, context: [...(e.context ?? []), note] })
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: TRANSITION }, async ($, e, next) => {
    const problem = approvalProblem(e.aprobacion, lastPrompt)
    return problem === null
      ? next(e)
      : { deny: `seckert: ${problem}. Solo el usuario aprueba o cierra un change: preguntale y usá sus palabras textuales.` }
  })


  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    if (!isChange(e.file_path) || !(await $.fs.exists(e.file_path))) return next(e)
    const before = await $.fs.read(e.file_path)
    const after = e.replace_all ? before.split(e.old_string).join(e.new_string) : before.replace(e.old_string, () => e.new_string)
    const problem = manualEditProblem(before, after)
    return problem === null ? next(e) : guard(problem)
  })

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    if (!isChange(e.file_path)) return next(e)
    const before = (await $.fs.exists(e.file_path)) ? await $.fs.read(e.file_path) : null
    const problem = manualEditProblem(before, e.content)
    return problem === null ? next(e) : guard(problem)
  })

  on('session.end', async ($, e, next) => {
    lastSent = null
    lastPrompt = null
    return next(e)
  })

  // Tests, builds y linters: Claude recibe los fallos y el resumen, no miles de
  // líneas en verde que se pagarían en cada turno siguiente.
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    try {
      if (ran.deny !== undefined) return ran

      // Con error (p.ej. tests que fallan) solo se puede reemplazar el texto
      // entero: se devuelve como deny, que el modelo lee en lugar del original.
      if (ran.isError === true) {
        const text = ran.text ?? ''
        return shouldCompact(e.command, text) ? { deny: compact(text) } : ran
      }

      const { stdout } = ran.result
      return shouldCompact(e.command, stdout) ? { result: { ...ran.result, stdout: compact(stdout) } } : ran
    } catch {
      return ran
    }
  })

  // Si Claude edita un change o cambia de rama a mitad de turno (también desde
  // Bash: git switch, sed sobre el change), la barra se actualiza enseguida.
  on('tool.call', async ($, e, next) => {
    const result = await next(e)
    const path = 'file_path' in e && typeof e.file_path === 'string' ? e.file_path : ''
    const command = 'command' in e && typeof e.command === 'string' ? e.command : ''
    const seckertTool = e.tool.startsWith('mcp__plugin_seckert_')
    if (seckertTool || path.includes(CHANGES_DIR) || command.includes(CHANGES_DIR) || /\bgit\b/.test(command)) await refresh($)
    return result
  })

  on('turn.complete', async ($, e, next) => {
    await refresh($)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const state = await read($, snapshot)
    const current = active(state)
    if (e.props.hasSurvey || current === null) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const others = state.changes.length - 1
    const questions = current.questions > 0 ? plural(current.questions) : null
    const detail =
      current.status === 'proposed'
        ? (questions ?? 'esperando tu "sí"')
        : `${current.done}/${current.total} · ${current.next ? `sigue: ${shortTask(current.next)}` : 'listo para cerrar'}${questions ? ` · ${questions}` : ''}`
    // La rama solo se muestra cuando no es la actual: es cuando importa.
    const branch = current.branch && current.branch !== state.branch ? ` · rama ${current.branch}` : ''

    return (
      <Box>
        <Text wrap="truncate-end">
          <Text color="cyan">seckert</Text>
          <Text dimColor> · </Text>
          <Text bold>{current.slug}</Text>
          <Text dimColor>
            {` · ${detail}${branch}${others > 0 ? ` · +${others} más` : ''}`}
          </Text>
        </Text>
      </Box>
    )
  })
}
