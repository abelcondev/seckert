---
type: regex
pattern: 'verify:[^\n]*PREEXISTENTE'
match: contains
target: {source: file, path: sdd/changes/2026-10-29-envio-express.md}
---
La línea `verify:` del Log marca el fallo como `PREEXISTENTE`.
