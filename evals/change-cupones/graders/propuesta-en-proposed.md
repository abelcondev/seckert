---
type: regex
pattern: '"file_path"\s*:\s*"[^"]*sdd/changes/[^"]*"[\s\S]*?status:\s*proposed|\\?"status\\?"\s*:\s*\\?"proposed'
match: contains
target: trace
---
La propuesta nace en status: proposed (escrita a mano o con change_create, que lo devuelve).
