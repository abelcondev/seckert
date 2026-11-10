---
type: regex
pattern: '"name":\s*"Plan",\s*"body":\s*"<!-- seckert:plan\\nstatus: approved'
match: contains
target: {source: file, path: .gh.json}
---
«dale, hacelas todas» aprueba el change: el plan del issue queda en approved.
