---
type: regex
pattern: '"name":\s*"Plan",\s*"body":\s*"<!-- seckert:plan\\nstatus: done'
match: contains
target: {source: file, path: .gh.json}
---
"cerralo" deja el change en done.
