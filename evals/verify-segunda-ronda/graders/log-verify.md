---
type: regex
pattern: '"name":\s*"Plan",\s*"body":\s*"(?:(?:[^"\\]|\\.)*verify:){2}'
match: contains
target: {source: file, path: .gh.json}
---
La segunda verificación queda en el Log como otra línea `verify:`.
