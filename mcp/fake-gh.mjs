#!/usr/bin/env node
// Un `gh` falso para los tests del MCP: guarda los issues en el JSON de
// FAKE_GH_STATE y anota cada llamada. Solo entiende lo que usa seckert.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const file = process.env.FAKE_GH_STATE
const db = JSON.parse(readFileSync(file, 'utf8'))
const args = process.argv.slice(2)
db.calls.push(args)

const flag = name => {
  const i = args.indexOf(name)
  return i === -1 ? undefined : args[i + 1]
}
const flags = name => args.flatMap((a, i) => (a === name ? [args[i + 1]] : []))
const save = () => writeFileSync(file, JSON.stringify(db, null, 2))
const find = n => {
  const issue = db.issues.find(i => String(i.number) === String(n))
  if (!issue) {
    process.stderr.write(`could not resolve to an issue with the number of ${n}\n`)
    save()
    process.exit(1)
  }
  return issue
}
const out = issue => ({
  number: issue.number,
  title: issue.title,
  body: issue.body,
  url: `https://github.com/${flag('--repo')}/issues/${issue.number}`,
  state: issue.state,
  stateReason: issue.stateReason ?? '',
  labels: issue.labels.map(name => ({ name })),
  closedByPullRequestsReferences: issue.prs ?? [],
  parent: issue.parent ? { number: issue.parent } : null,
  subIssues: { nodes: db.issues.filter(i => i.parent === issue.number).map(rel), totalCount: 0 },
  blockedBy: { nodes: (issue.blockedBy ?? []).map(n => rel(db.issues.find(i => i.number === n))), totalCount: 0 },
})
const rel = i => ({ number: i.number, state: i.state, title: i.title })

const [group, cmd] = args
if (group === 'label' && cmd === 'create') {
  // nada: las labels existen siempre en el falso
} else if (group === 'issue' && cmd === 'create') {
  const number = db.issues.length + 1
  const parent = flag('--parent') ? Number(flag('--parent')) : undefined
  const blockedBy = flag('--blocked-by') ? flag('--blocked-by').split(',').map(Number) : undefined
  db.issues.push({ number, title: flag('--title'), body: readFileSync(0, 'utf8'), state: 'OPEN', labels: flags('--label'), comments: [], ...(parent ? { parent } : {}), ...(blockedBy ? { blockedBy } : {}) })
  process.stdout.write(`https://github.com/${flag('--repo')}/issues/${number}\n`)
} else if (group === 'issue' && cmd === 'view') {
  process.stdout.write(JSON.stringify(out(find(args[2]))))
} else if (group === 'issue' && cmd === 'list') {
  const state = flag('--state') ?? 'open'
  const labels = flags('--label')
  const list = db.issues.filter(i => (state === 'all' || i.state === 'OPEN') && labels.every(l => i.labels.includes(l)))
  process.stdout.write(JSON.stringify(list.map(out)))
} else if (group === 'issue' && cmd === 'edit') {
  const issue = find(args[2])
  issue.labels = issue.labels.filter(l => !flags('--remove-label').includes(l)).concat(flags('--add-label'))
  if (flag('--body-file') === '-') issue.body = readFileSync(0, 'utf8')
} else if (group === 'issue' && cmd === 'close') {
  const issue = find(args[2])
  issue.state = 'CLOSED'
  issue.stateReason = flag('--reason') === 'not planned' ? 'NOT_PLANNED' : 'COMPLETED'
} else if (group === 'issue' && cmd === 'comment') {
  find(args[2]).comments.push(flag('--body'))
} else if (group === 'issue' && cmd === 'develop' && args[2] === '--list') {
  process.stdout.write((find(args[3]).branches ?? []).map(b => `${b}\thttps://github.com/x\n`).join(''))
} else if (group === 'issue' && cmd === 'develop') {
  // Crea la rama enlazada; con --checkout, también la local (gh corre en la raíz del repo).
  const issue = find(args[2])
  issue.branches = [...(issue.branches ?? []), flag('--name')]
  if (args.includes('--checkout')) execFileSync('git', ['switch', '-q', '-c', flag('--name')])
} else if (group === 'api' && cmd === 'graphql') {
  // Projects: el Project enlazado (db.board) y las mutaciones de campos.
  const { query, variables } = JSON.parse(readFileSync(0, 'utf8'))
  const b = db.board
  if (query.includes('ProjectV2IterationField')) {
    process.stdout.write(JSON.stringify({ data: { node: { field: { configuration: { iterations: b?.iterations ?? [] } } } } }))
  } else if (query.includes('projectsV2(')) {
    process.stdout.write(JSON.stringify({ data: { repository: { projectsV2: { nodes: b ? [{ id: b.id, number: b.number, title: b.title }] : [] } } } }))
  } else {
    process.stdout.write('{"data":{}}')
  }
} else if (group === 'project') {
  const b = db.board
  const item = url => {
    let it = b.items.find(i => i.url === url)
    if (!it) {
      it = { id: `PVTI_${b.items.length + 1}`, url, values: {}, archived: false }
      b.items.push(it)
    }
    return it
  }
  if (!b) {
    process.stderr.write(`fake gh: no hay Project para ${cmd}\n`)
    save()
    process.exit(1)
  }
  const statusName = it => {
    const f = b.fields.find(x => x.name === 'Status')
    return f?.options?.find(o => o.id === it.values[f.id])?.name
  }
  if (cmd === 'field-list') process.stdout.write(JSON.stringify({ fields: b.fields, totalCount: b.fields.length }))
  else if (cmd === 'item-list') process.stdout.write(JSON.stringify({ items: b.items.filter(i => !i.archived).map(i => ({ id: i.id, content: { url: i.url }, status: statusName(i) })) }))
  else if (cmd === 'item-add') process.stdout.write(JSON.stringify({ id: item(flag('--url')).id }))
  else if (cmd === 'item-edit') {
    const it = b.items.find(i => i.id === flag('--id'))
    const field = flag('--field-id')
    if (args.includes('--clear')) delete it.values[field]
    else it.values[field] = flag('--single-select-option-id') ?? flag('--iteration-id') ?? flag('--number') ?? flag('--text')
    process.stdout.write('{}')
  } else if (cmd === 'item-archive') {
    b.items.find(i => i.id === flag('--id')).archived = true
  } else {
    process.stderr.write(`fake gh: no entiendo ${args.join(' ')}\n`)
    save()
    process.exit(1)
  }
} else if (group === 'api') {
  // Issue artifacts: GET/POST/PATCH sobre repos/<o>/<r>/issues/<n>/artifacts[/<m>]. Con
  // artifactsUnavailable, la API no existe para el repo (preview no habilitada).
  if (db.artifactsUnavailable) {
    process.stderr.write('HTTP 404: Not Found\n')
    save()
    process.exit(1)
  }
  const method = flag('-X') ?? 'GET'
  const path = args.find(a => a.startsWith('repos/'))
  const m = path.match(/^repos\/[^/]+\/[^/]+\/issues\/(\d+)\/artifacts(?:\/(\d+))?(?:\?type=(\w+))?$/)
  const issue = find(m[1])
  issue.artifacts = issue.artifacts ?? []
  const out = a => ({ ...a, html_url: `https://github.com/x/issues/${issue.number}#artifact-${a.number}` })
  if (method === 'GET') {
    process.stdout.write(JSON.stringify(issue.artifacts.filter(a => !m[3] || a.type === m[3]).map(out)))
  } else if (method === 'POST') {
    const input = JSON.parse(readFileSync(0, 'utf8'))
    const artifact = { number: issue.artifacts.length + 1, type: input.type ?? 'generic', name: input.name, body: input.body, versions: [input.body] }
    issue.artifacts.push(artifact)
    process.stdout.write(JSON.stringify(out(artifact)))
  } else if (method === 'PATCH') {
    const input = JSON.parse(readFileSync(0, 'utf8'))
    const artifact = issue.artifacts.find(a => String(a.number) === m[2])
    artifact.body = input.body
    artifact.versions.push(input.body)
    process.stdout.write(JSON.stringify(out(artifact)))
  }
} else if (group === 'pr' && cmd === 'create') {
  // Guarda el PR y lo enlaza a los issues que nombra con Fixes #n (quedan in-review).
  const bodyFile = flag('--body-file')
  const body = flag('--body') ?? (bodyFile ? readFileSync(bodyFile === '-' ? 0 : bodyFile, 'utf8') : '')
  db.prs = [...(db.prs ?? []), { title: flag('--title'), base: flag('--base'), body }]
  const number = db.prs.length
  for (const [, n] of body.matchAll(/(?:Fixes|Closes|Resolves) #(\d+)/gi)) {
    const issue = db.issues.find(i => String(i.number) === n)
    if (issue) issue.prs = [...(issue.prs ?? []), { number }]
  }
  process.stdout.write(`https://github.com/eval/tienda/pull/${number}\n`)
} else {
  process.stderr.write(`fake gh: no entiendo ${args.join(' ')}\n`)
  save()
  process.exit(1)
}
save()
