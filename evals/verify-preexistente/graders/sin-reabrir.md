---
type: regex
pattern: '"name":\s*"Plan",\s*"body":\s*"(?:[^"\\]|\\.)*- \[ \]'
match: not_contains
target: {source: file, path: .gh.json}
---
Un test que ya fallaba en main no reabre las tareas del change.
