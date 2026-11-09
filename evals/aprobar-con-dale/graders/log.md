---
type: regex
pattern: '"name":\s*"Plan",\s*"body":\s*"(?:[^"\\]|\\.)*aprobado'
flags: i
match: contains
target: {source: file, path: .gh.json}
---
La aprobación queda anotada en el Log del plan.
