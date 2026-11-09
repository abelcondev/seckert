---
type: regex
pattern: '"name":\s*"Plan",\s*"body":\s*"(?:(?:[^"\\]|\\.)*verify:){3}'
match: contains
target: {source: file, path: .gh.json}
---
La verificación nueva queda en el Log como una línea `verify:` más.
