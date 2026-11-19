---
type: regex
pattern: '"name":\s*"Plan",\s*"body":\s*"(?:[^"\\]|\\.)*verify:'
match: contains
target: {source: file, path: .gh.json}
---
La verificación sigue y queda en el Log del plan aunque no haya navegador.
