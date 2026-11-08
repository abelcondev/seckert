---
type: regex
pattern: '"F_priority":\s*"p0"[\s\S]*"F_size":\s*"z2"[\s\S]*"F_cycle":\s*"it1"|"F_cycle":\s*"it1"[\s\S]*"F_priority":\s*"p0"'
match: contains
target: {source: file, path: .gh.json}
---
El tablero queda con Urgent, M y el cycle actual (Cycle 1).
