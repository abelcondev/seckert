---
type: regex
pattern: '- \[ \]'
match: not_contains
target: {source: file, path: sdd/changes/2026-10-29-envio-express.md}
---
Un test que ya fallaba en main no reabre las tareas del change.
