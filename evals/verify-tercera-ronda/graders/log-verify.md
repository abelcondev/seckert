---
type: regex
pattern: '(verify:[\s\S]*){3}'
match: contains
target: {source: file, path: sdd/changes/2026-10-29-descuento.md}
---
La verificación nueva queda en el Log como una línea `verify:` más.
