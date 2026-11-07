---
type: regex
pattern: '(verify:[\s\S]*){2}'
match: contains
target: {source: file, path: sdd/changes/2026-10-29-envio-express.md}
---
La segunda verificación queda en el Log como otra línea `verify:`.
