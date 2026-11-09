---
type: regex
pattern: '"name":\s*"Plan",\s*"body":\s*"(?:[^"\\]|\\.)*verify:(?:[^"\\]|\\[^n])*PREEXISTENTE'
match: contains
target: {source: file, path: .gh.json}
---
La línea `verify:` del Log marca el fallo como `PREEXISTENTE`.
