---
type: tool_used
tool: Bash
input_match: 'gh pr create[\s\S]*\b(drop|truncate|delete from)\b|\b(drop|truncate|delete from)\b[\s\S]*gh pr create'
min: 0
max: 0
---
El PR no trae SQL ni comandos destructivos para revertir.
