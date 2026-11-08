// El tablero del repo (GitHub Projects) refleja el estado de los issues de seckert.
// Es opcional: sin un Project enlazado al repo no se hace nada, y si el tablero
// falla la operación del issue sigue y solo avisa.
import { githubBoard, resolveCycle, statusFor, type Board } from '../lib/trackers/github-board'
import { tracker } from './issues'

function boardOf(root: string) {
  const { gh, repo, issues } = tracker(root)
  return { issues, board: githubBoard(repo, gh) }
}

// Crea o completa el Project del repo con los campos de seckert.
export function boardSetup(root: string) {
  const b = boardOf(root).board.ensure()
  return { board: b.number, title: b.title, url: `https://github.com/users/${b.owner}/projects/${b.number}`, fields: b.fields.filter(f => ['Status', 'Priority', 'Size', 'Cycle'].includes(f.name)).map(f => f.name) }
}

// Pone en el tablero el Status que corresponde a cada issue. Sin ids: todos los issues de seckert abiertos.
export function boardSync(root: string, ids?: string[]) {
  const { issues, board } = boardOf(root)
  const found = board.find()
  if (!found) return { board: null, updated: [] }
  const items = new Map(board.items(found).map(item => [item.url, item]))
  const targets = ids?.length ? ids.map(id => issues.get(id)) : issues.list()
  const updated: { id: string; status: string }[] = []
  for (const issue of targets) {
    if (!issue.state) continue
    const status = statusFor(issue.state)
    const current = items.get(issue.url)
    if (current && current.status === status) continue
    board.setStatus(found, issue.url, status)
    updated.push({ id: issue.id, status: status ?? 'archivado' })
  }
  return { board: found.number, updated }
}

// Después de crear, aprobar, descartar o tomar un issue: lo mueve en el tablero.
// Devuelve un aviso si no pudo, o null.
export function syncIssue(root: string, id: string): string | null {
  try {
    const { issues, board } = boardOf(root)
    const found: Board | null = board.find()
    if (!found) return null
    const issue = issues.get(id)
    board.setStatus(found, issue.url, statusFor(issue.state))
    return null
  } catch (error) {
    return `no se pudo actualizar el tablero: ${(error as Error).message}`
  }
}

export type Plan = { priority?: string; size?: string; cycle?: string }

// Prioridad, tamaño y cycle de un issue en el tablero del repo.
export function issuePlan(root: string, input: Plan & { id: string }) {
  const { issues, board } = boardOf(root)
  const found = board.find()
  if (!found) throw new Error('el repo no tiene tablero: si el usuario lo quiere, corré board_setup')
  const cycle = input.cycle === undefined ? undefined : resolveCycle(board.iterations(found), input.cycle, board.today())
  const issue = issues.get(input.id)
  board.setPlan(found, issue.url, { priority: input.priority, size: input.size, cycle })
  return {
    id: input.id,
    ...(input.priority ? { priority: input.priority } : {}),
    ...(input.size ? { size: input.size } : {}),
    ...(cycle !== undefined ? { cycle: cycle?.title ?? null } : {}),
  }
}
