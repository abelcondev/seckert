---
type: regex
pattern: '"name":\s*"Plan",\s*"body":\s*"(?:[^"\\]|\\.)*- \[ \] T3 Botón'
match: not_contains
target: {source: file, path: .gh.json}
---
La T3 se quitó del plan.
