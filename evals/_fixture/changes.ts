// Agrega al .gh.json del repo de prueba un issue por cada change de una carpeta,
// con su plan como artifact (el change vive en su issue). Correr después de gh-repo.sh.
// Uso: bun changes.ts <carpeta con <slug>.md>
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { changeIssue } from '../../mcp/seed'

const dir = process.argv[2]!
const db = JSON.parse(readFileSync('.gh.json', 'utf8'))
for (const name of readdirSync(dir).filter(n => n.endsWith('.md')).sort()) {
  db.issues.push(changeIssue(readFileSync(join(dir, name), 'utf8'), db.issues.length + 1))
}
writeFileSync('.gh.json', JSON.stringify(db, null, 2))
