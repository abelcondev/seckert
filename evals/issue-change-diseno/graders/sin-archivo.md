---
type: regex
pattern: '\\?"file\\?"\s*:\s*\\?"sdd/changes/'
match: not_contains
target: trace
---
No se escribe archivo en sdd/changes: change_create devuelve el issue, no un archivo.
