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
})

const [group, cmd] = args
if (group === 'label' && cmd === 'create') {
  // nada: las labels existen siempre en el falso
} else if (group === 'issue' && cmd === 'create') {
  const number = db.issues.length + 1
  db.issues.push({ number, title: flag('--title'), body: readFileSync(0, 'utf8'), state: 'OPEN', labels: flags('--label'), comments: [] })
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
