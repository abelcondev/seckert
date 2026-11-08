// El tablero de GitHub Projects del repo: el Project enlazado al repo (o uno
// nuevo con su nombre) con los campos de seckert: Status con sus estados,
// Priority, Size y Cycle (iteraciones de 2 semanas). Habla con `gh`; las
// opciones de Status y el campo Iteration van por GraphQL porque `gh project`
// no los maneja.
import type { IssueState } from '../issue'
import type { Gh } from './github'

export const STATUSES = ['Draft', 'Approved', 'In Progress', 'In Review', 'Done'] as const
export const PRIORITIES = ['Urgent', 'High', 'Medium', 'Low'] as const
export const SIZES = ['XS', 'S', 'M', 'L', 'XL'] as const
export const CYCLE = 'Cycle'
export const CYCLE_DAYS = 14

const STATUS_COLORS: Record<(typeof STATUSES)[number], string> = {
  Draft: 'PURPLE',
  Approved: 'GREEN',
  'In Progress': 'YELLOW',
  'In Review': 'BLUE',
  Done: 'GRAY',
}

// La columna de cada estado de seckert; un issue descartado se archiva.
export function statusFor(state: IssueState | null): (typeof STATUSES)[number] | null {
  const map: Record<IssueState, (typeof STATUSES)[number] | null> = {
    draft: 'Draft',
    approved: 'Approved',
    'in-progress': 'In Progress',
    'in-review': 'In Review',
    closed: 'Done',
    discarded: null,
  }
  return state ? map[state] : null
}

export type BoardItem = { id: string; url: string; status: string | null }

export type BoardField = { id: string; name: string; type: string; options?: { id: string; name: string }[] }
export type Board = { id: string; number: number; title: string; owner: string; fields: BoardField[] }

// El lunes de la semana de una fecha YYYY-MM-DD: los cycles arrancan en lunes.
export function mondayOf(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export type Iteration = { id: string; title: string; startDate: string; duration: number }

// El cycle que pide el usuario: «current» (el de hoy), «next» (el siguiente), «none» (sin cycle) o un título.
export function resolveCycle(iterations: Iteration[], value: string, today: string): Iteration | null {
  const v = value.trim().toLowerCase()
  if (v === 'none') return null
  if (v === 'current') {
    const found = iterations.find(i => i.startDate <= today && today < addDays(i.startDate, i.duration))
    if (!found) throw new Error(`no hay un cycle que incluya hoy (${today})`)
    return found
  }
  if (v === 'next') {
    const found = [...iterations].sort((a, b) => a.startDate.localeCompare(b.startDate)).find(i => i.startDate > today)
    if (!found) throw new Error('no hay un cycle siguiente: agregalo en el tablero')
    return found
  }
  const found = iterations.find(i => i.title.toLowerCase() === v)
  if (!found) throw new Error(`no hay un cycle «${value}»: ${iterations.map(i => i.title).join(', ')}`)
  return found
}

const defaultToday = () => process.env.SECKERT_TODAY || new Date().toISOString().slice(0, 10)

export function githubBoard(repo: string, gh: Gh, today: () => string = defaultToday) {
  const [owner, name] = repo.split('/') as [string, string]
  const graphql = (query: string, variables: Record<string, unknown>) => JSON.parse(gh(['api', 'graphql', '--input', '-'], JSON.stringify({ query, variables })) || '{}')

  function linked(): { id: string; number: number; title: string } | null {
    const query = 'query($owner:String!,$name:String!){repository(owner:$owner,name:$name){projectsV2(first:20){nodes{id number title}}}}'
    const nodes = graphql(query, { owner, name }).data?.repository?.projectsV2?.nodes ?? []
    return nodes[0] ?? null
  }

  function create(): { id: string; number: number; title: string } {
    const project = JSON.parse(gh(['project', 'create', '--owner', owner, '--title', name, '--format', 'json']))
    gh(['project', 'link', String(project.number), '--owner', owner, '--repo', repo])
    return { id: project.id, number: project.number, title: project.title }
  }

  const fieldList = (number: number): BoardField[] => JSON.parse(gh(['project', 'field-list', String(number), '--owner', owner, '--format', 'json'])).fields

  function ensureFields(project: { id: string; number: number }): BoardField[] {
    let fields = fieldList(project.number)
    const byName = (n: string) => fields.find(f => f.name === n)

    const status = byName('Status')
    const current = status?.options?.map(o => o.name) ?? []
    if (status && JSON.stringify(current) !== JSON.stringify(STATUSES)) {
      const options = STATUSES.map(s => {
        const existing = status.options?.find(o => o.name === s)
        return { ...(existing ? { id: existing.id } : {}), name: s, color: STATUS_COLORS[s], description: '' }
      })
      graphql(
        'mutation($fieldId:ID!,$options:[ProjectV2SingleSelectFieldOptionInput!]){updateProjectV2Field(input:{fieldId:$fieldId,singleSelectOptions:$options}){clientMutationId}}',
        { fieldId: status.id, options },
      )
    }
    for (const [field, options] of [
      ['Priority', PRIORITIES],
      ['Size', SIZES],
    ] as const) {
      if (!byName(field))
        gh(['project', 'field-create', String(project.number), '--owner', owner, '--name', field, '--data-type', 'SINGLE_SELECT', '--single-select-options', options.join(','), '--format', 'json'])
    }
    if (!byName(CYCLE)) {
      const start = mondayOf(today())
      const iterations = [0, 1, 2].map(i => ({ startDate: addDays(start, i * CYCLE_DAYS), duration: CYCLE_DAYS, title: `${CYCLE} ${i + 1}` }))
      graphql(
        'mutation($projectId:ID!,$name:String!,$config:ProjectV2IterationFieldConfigurationInput!){createProjectV2Field(input:{projectId:$projectId,dataType:ITERATION,name:$name,iterationConfiguration:$config}){clientMutationId}}',
        { projectId: project.id, name: CYCLE, config: { startDate: start, duration: CYCLE_DAYS, iterations } },
      )
    }
    fields = fieldList(project.number)
    return fields
  }

  const field = (board: Board, fieldName: string) => {
    const found = board.fields.find(f => f.name === fieldName)
    if (!found) throw new Error(`el tablero «${board.title}» no tiene el campo ${fieldName}: corré board_setup`)
    return found
  }

  return {
    // Encuentra o crea el Project del repo y deja sus campos listos.
    ensure(): Board {
      const project = linked() ?? create()
      return { ...project, owner, fields: ensureFields(project) }
    },

    // El Project enlazado al repo, sin crear ni cambiar nada; null si no hay.
    find(): Board | null {
      const project = linked()
      return project ? { ...project, owner, fields: fieldList(project.number) } : null
    },

    iterations(board: Board): Iteration[] {
      const query = 'query($id:ID!){node(id:$id){... on ProjectV2{field(name:"Cycle"){... on ProjectV2IterationField{configuration{iterations{id title startDate duration}}}}}}}'
      return graphql(query, { id: board.id }).data?.node?.field?.configuration?.iterations ?? []
    },

    today,

    // Prioridad, tamaño y cycle de un issue en el tablero. Un cycle null lo saca del cycle.
    setPlan(board: Board, url: string, plan: { priority?: string; size?: string; cycle?: Iteration | null }): void {
      const item = JSON.parse(gh(['project', 'item-add', String(board.number), '--owner', owner, '--url', url, '--format', 'json'])).id as string
      const edit = (fieldId: string, value: string[]) => gh(['project', 'item-edit', '--id', item, '--project-id', board.id, '--field-id', fieldId, ...value])
      for (const [name, value] of [
        ['Priority', plan.priority],
        ['Size', plan.size],
      ] as const) {
        if (value === undefined) continue
        const f = field(board, name)
        const option = f.options?.find(o => o.name.toLowerCase() === value.toLowerCase())
        if (!option) throw new Error(`${name} no tiene la opción «${value}»: ${f.options?.map(o => o.name).join(', ')}`)
        edit(f.id, ['--single-select-option-id', option.id])
      }
      if (plan.cycle !== undefined) {
        const f = field(board, CYCLE)
        edit(f.id, plan.cycle ? ['--iteration-id', plan.cycle.id] : ['--clear'])
      }
    },

    items(board: Board): BoardItem[] {
      const raw = JSON.parse(gh(['project', 'item-list', String(board.number), '--owner', owner, '--format', 'json', '--limit', '500']))
      return (raw.items ?? []).map((i: { id: string; content?: { url?: string }; status?: string; Status?: string }) => ({ id: i.id, url: i.content?.url ?? '', status: i.status ?? i.Status ?? null }))
    },

    // Agrega el issue al tablero (si ya está, devuelve el mismo item) y le pone el Status; null lo archiva.
    setStatus(board: Board, url: string, status: (typeof STATUSES)[number] | null): string {
      const item = JSON.parse(gh(['project', 'item-add', String(board.number), '--owner', owner, '--url', url, '--format', 'json'])).id as string
      if (status === null) {
        gh(['project', 'item-archive', String(board.number), '--owner', owner, '--id', item])
        return item
      }
      const statusField = field(board, 'Status')
      const option = statusField.options?.find(o => o.name === status)
      if (!option) throw new Error(`el campo Status de «${board.title}» no tiene la opción ${status}: corré board_setup`)
      gh(['project', 'item-edit', '--id', item, '--project-id', board.id, '--field-id', statusField.id, '--single-select-option-id', option.id])
      return item
    },
  }
}
