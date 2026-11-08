import { expect, test } from 'claude-code/testing'

import { githubBoard, PRIORITIES, SIZES, STATUSES } from '../lib/trackers/github-board'
import type { Gh } from '../lib/trackers/github'

type Call = { args: string[]; input?: string }

// Un gh simulado para Projects: el Project y sus campos viven en memoria.
function fakeGh(start: { linked?: boolean; fields?: { id: string; name: string; type: string; options?: { id: string; name: string }[] }[] } = {}) {
  const calls: Call[] = []
  let linked = start.linked ?? false
  let fields = start.fields ?? [
    { id: 'F_title', name: 'Title', type: 'ProjectV2Field' },
    { id: 'F_status', name: 'Status', type: 'ProjectV2SingleSelectField', options: [{ id: 'o1', name: 'Todo' }, { id: 'o2', name: 'In Progress' }, { id: 'o3', name: 'Done' }] },
  ]
  const gh: Gh = (args, input) => {
    calls.push({ args, input })
    const cmd = args.slice(0, 2).join(' ')
    if (cmd === 'api graphql') {
      const { query, variables } = JSON.parse(input!)
      if (query.includes('projectsV2(')) return JSON.stringify({ data: { repository: { projectsV2: { nodes: linked ? [{ id: 'PVT_1', number: 7, title: 'tienda' }] : [] } } } })
      if (query.includes('updateProjectV2Field')) {
        fields = fields.map(f => (f.id === variables.fieldId ? { ...f, options: variables.options.map((o: { id?: string; name: string }, i: number) => ({ id: o.id ?? `n${i}`, name: o.name })) } : f))
        return '{"data":{}}'
      }
      if (query.includes('createProjectV2Field')) {
        fields.push({ id: 'F_cycle', name: variables.name, type: 'ProjectV2IterationField' })
        return '{"data":{}}'
      }
    }
    if (cmd === 'project create') return JSON.stringify({ id: 'PVT_1', number: 7, title: 'tienda' })
    if (cmd === 'project link') {
      linked = true
      return ''
    }
    if (cmd === 'project field-list') return JSON.stringify({ fields, totalCount: fields.length })
    if (cmd === 'project field-create') {
      const name = args[args.indexOf('--name') + 1]!
      const options = args[args.indexOf('--single-select-options') + 1]!.split(',')
      fields.push({ id: `F_${name}`, name, type: 'ProjectV2SingleSelectField', options: options.map((o, i) => ({ id: `${name}${i}`, name: o })) })
      return '{}'
    }
    throw new Error(`gh falso: no entiendo ${args.join(' ')}`)
  }
  return { gh, calls, fields: () => fields }
}

const TODAY = () => '2026-11-11' // un miércoles

test('sin Project enlazado, lo crea con el nombre del repo, lo enlaza y arma los campos', () => {
  const { gh, calls, fields } = fakeGh()
  const board = githubBoard('acme/tienda', gh, TODAY).ensure()
  expect(board).toMatchObject({ id: 'PVT_1', number: 7 })
  expect(calls.find(c => c.args[1] === 'create')!.args).toEqual(['project', 'create', '--owner', 'acme', '--title', 'tienda', '--format', 'json'])
  expect(calls.find(c => c.args[1] === 'link')!.args).toEqual(['project', 'link', '7', '--owner', 'acme', '--repo', 'acme/tienda'])

  const byName = Object.fromEntries(fields().map(f => [f.name, f]))
  expect(byName.Status!.options!.map(o => o.name)).toEqual([...STATUSES])
  // Las opciones que ya existían conservan su id (no se pierden los valores de los items).
  expect(byName.Status!.options!.find(o => o.name === 'In Progress')!.id).toBe('o2')
  expect(byName.Priority!.options!.map(o => o.name)).toEqual([...PRIORITIES])
  expect(byName.Size!.options!.map(o => o.name)).toEqual([...SIZES])
  expect(byName.Cycle!.type).toBe('ProjectV2IterationField')

  const cycle = JSON.parse(calls.find(c => c.input?.includes('createProjectV2Field'))!.input!)
  expect(cycle.variables).toMatchObject({ projectId: 'PVT_1', name: 'Cycle', config: { startDate: '2026-11-09', duration: 14 } })
  expect(cycle.variables.config.iterations.length).toBeGreaterThan(0)
})

test('con el Project ya enlazado y completo, no crea ni cambia nada', () => {
  const ready = fakeGh()
  githubBoard('acme/tienda', ready.gh, TODAY).ensure()
  const again = fakeGh({ linked: true, fields: ready.fields() })
  githubBoard('acme/tienda', again.gh, TODAY).ensure()
  const writes = again.calls.filter(c => ['create', 'link', 'field-create'].includes(c.args[1]!) || /mutation/.test(c.input ?? ''))
  expect(writes).toEqual([])
})
