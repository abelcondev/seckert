// Agrega al .gh.json un tablero enlazado al repo (GitHub Projects) para el gh falso.
// El Cycle 1 incluye hoy y el Cycle 2 es el siguiente. Uso: node board.mjs ['<items json>']
// items: [{ issue: 1, status: 'Approved', priority: 'High', size: 'M', cycle: 1 }]
import { readFileSync, writeFileSync } from 'node:fs'

const db = JSON.parse(readFileSync('.gh.json', 'utf8'))
const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10)
const STATUS = ['Draft', 'Approved', 'In Progress', 'In Review', 'Done']
const PRIORITY = ['Urgent', 'High', 'Medium', 'Low']
const SIZE = ['XS', 'S', 'M', 'L', 'XL']
const fields = [
  { id: 'F_status', name: 'Status', type: 'ProjectV2SingleSelectField', options: STATUS.map((name, i) => ({ id: `s${i}`, name })) },
  { id: 'F_priority', name: 'Priority', type: 'ProjectV2SingleSelectField', options: PRIORITY.map((name, i) => ({ id: `p${i}`, name })) },
  { id: 'F_size', name: 'Size', type: 'ProjectV2SingleSelectField', options: SIZE.map((name, i) => ({ id: `z${i}`, name })) },
  { id: 'F_cycle', name: 'Cycle', type: 'ProjectV2IterationField' },
]
const iterations = [
  { id: 'it1', title: 'Cycle 1', startDate: day(-3), duration: 14 },
  { id: 'it2', title: 'Cycle 2', startDate: day(11), duration: 14 },
]
const spec = JSON.parse(process.argv[2] ?? '[]')
const items = spec.map((s, n) => ({
  id: `PVTI_${n + 1}`,
  url: `https://github.com/eval/tienda/issues/${s.issue}`,
  archived: false,
  values: {
    ...(s.status ? { F_status: `s${STATUS.indexOf(s.status)}` } : {}),
    ...(s.priority ? { F_priority: `p${PRIORITY.indexOf(s.priority)}` } : {}),
    ...(s.size ? { F_size: `z${SIZE.indexOf(s.size)}` } : {}),
    ...(s.cycle ? { F_cycle: `it${s.cycle}` } : {}),
  },
}))
db.board = { id: 'PVT_1', number: 1, title: 'tienda', fields, iterations, items }
writeFileSync('.gh.json', JSON.stringify(db, null, 2))
