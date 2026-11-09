---
type: regex
pattern: '"name":\s*"Plan",\s*"body":\s*"(?:[^"\\]|\\.)*- \[ \]'
match: not_contains
target: {source: file, path: .gh.json}
---
Al tercer fallo del mismo punto no se reabren las tareas.
