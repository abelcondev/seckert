---
type: regex
pattern: '"number":\s*3,[^{}]*"branches"'
match: not_contains
target: {source: file, path: .gh.json}
---
La parte bloqueada (#3) no se toma: espera el merge de #2, que pide el usuario.
