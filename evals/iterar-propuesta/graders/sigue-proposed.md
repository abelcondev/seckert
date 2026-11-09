---
type: regex
pattern: '"name":\s*"Plan",\s*"body":\s*"<!-- seckert:plan\\nstatus: proposed'
match: contains
target: {source: file, path: .gh.json}
---
Ajustar no es aprobar: el plan sigue en proposed.
