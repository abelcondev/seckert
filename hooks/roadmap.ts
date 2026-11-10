// La barra de seckert: el change activo y su progreso, armado con lo que ya
// devuelven las herramientas del MCP. No llama a gh ni lee archivos.

export type Roadmap = {
  slug: string
  status: string
  done: number
  total: number
  next: string | null
  questions: number
}

const MCP = 'mcp__plugin_seckert_seckert__'

type Task = { id: string; text: string; done: boolean }

function isTask(value: unknown): value is Task {
  const task = value as Task
  return typeof task?.id === 'string' && typeof task.text === 'string' && typeof task.done === 'boolean'
}

function count(value: unknown): number {
  return Array.isArray(value) ? value.length : typeof value === 'number' ? value : 0
}

// El nuevo estado de la barra después de una herramienta: un Roadmap, null si el
// change se cerró, o undefined si el resultado no dice nada de un change.
export function roadmapFrom(tool: string, input: Record<string, unknown>, text: string): Roadmap | null | undefined {
  if (!tool.startsWith(MCP)) return undefined
  let out: Record<string, unknown>
  try {
    out = JSON.parse(text)
  } catch {
    return undefined
  }
  if (typeof out !== 'object' || out === null || typeof out.slug !== 'string') return undefined
  if (out.status === 'done') return null

  // change_create devuelve solo el slug: las tareas son las que se le pasaron.
  const tasks: Task[] =
    tool === `${MCP}change_create` && Array.isArray(input.tasks)
      ? input.tasks.map((text, i) => ({ id: `T${i + 1}`, text: String(text), done: false }))
      : Array.isArray(out.tasks)
        ? out.tasks.filter(isTask)
        : []
  if (tasks.length === 0 || typeof out.status !== 'string') return undefined

  const next = tasks.find(task => !task.done)
  return {
    slug: out.slug,
    status: out.status,
    done: tasks.filter(task => task.done).length,
    total: tasks.length,
    next: next ? `${next.id} ${next.text}` : null,
    questions: tool === `${MCP}change_create` ? count(input.questions) : count(out.questions),
  }
}

// El título de la tarea, sin el detalle que sigue a ":" o " — ".
function shortTask(task: string): string {
  const title = task.split(/: | — | - /)[0] ?? task
  return title.length > 40 ? `${title.slice(0, 39)}…` : title
}

function plural(n: number): string {
  return n === 1 ? '1 pregunta abierta' : `${n} preguntas abiertas`
}

export function barText(map: Roadmap): string {
  const questions = map.questions > 0 ? plural(map.questions) : null
  const detail =
    map.status === 'proposed'
      ? `${map.total} tareas · ${questions ?? 'esperando tu "sí"'}`
      : `${map.done}/${map.total} · ${map.next ? `sigue: ${shortTask(map.next)}` : 'listo para verificar'}${questions ? ` · ${questions}` : ''}`
  return `seckert · ${map.slug} · ${detail}`
}
