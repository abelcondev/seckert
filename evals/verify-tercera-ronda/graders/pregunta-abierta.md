---
type: regex
pattern: '## (Open questions|Preguntas abiertas)\s*\n\s*- \S'
match: contains
target: {source: file, path: sdd/changes/2026-10-29-descuento.md}
---
El tercer fallo queda como pregunta abierta, con una recomendación.
