---
type: regex
pattern: '"name":\s*"Plan",\s*"body":\s*"<!-- seckert:plan\\nstatus: approved'
match: contains
target: {source: file, path: .gh.json}
---
"dale" con un change en proposed lo aprueba: el plan del issue queda en approved.
