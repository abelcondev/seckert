// Escribe .gh.json con issues v2 para el gh falso. Uso: node issues.mjs '<json>'
// Cada issue: { title, route, problem, outcome, criteria: [], labels: [], parent?, blockedBy?: [] }
import { writeFileSync } from 'node:fs'

const spec = JSON.parse(process.argv[2])
const issues = spec.map((i, n) => ({
  number: n + 1,
  title: i.title,
  body: [
    '<!-- seckert:issue v2 -->', '', '## Problem', '', i.problem, '', '## Outcome', '', i.outcome, '',
    '## Acceptance criteria', '', ...i.criteria.map(c => `- [ ] ${c}`), '', '## Route', '', i.route, '',
    '## Origin', '', '- Client: Acme', '',
  ].join('\n'),
  state: 'OPEN',
  labels: i.labels ?? ['seckert:approved'],
  comments: ['Aprobado por el usuario: «dale»'],
  ...(i.parent ? { parent: i.parent } : {}),
  ...(i.blockedBy ? { blockedBy: i.blockedBy } : {}),
}))
writeFileSync('.gh.json', JSON.stringify({ issues, calls: [] }, null, 2))
