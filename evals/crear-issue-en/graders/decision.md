---
type: regex
pattern: '## Decisions\\n\\n- [^\\]*(;|punto y coma|semicolon)'
flags: i
match: contains
target: {source: file, path: .gh.json}
---
Lo que el pedido ya trae decidido (el separador) va a Decisions, no a Open questions.
