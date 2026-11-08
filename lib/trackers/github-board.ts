// El tablero de GitHub Projects del repo: el Project enlazado al repo (o uno
// nuevo con su nombre) con los campos de seckert: Status con sus estados,
// Priority, Size y Cycle (iteraciones de 2 semanas). Habla con `gh`; las
// opciones de Status y el campo Iteration van por GraphQL porque `gh project`
// no los maneja.
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

export function githubBoard(repo: string, gh: Gh, today: () => string = () => new Date().toISOString().slice(0, 10)) {
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

  return {
    // Encuentra o crea el Project del repo y deja sus campos listos.
    ensure(): Board {
      const project = linked() ?? create()
      return { ...project, owner, fields: ensureFields(project) }
    },
  }
}
