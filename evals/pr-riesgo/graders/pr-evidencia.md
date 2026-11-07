---
type: tool_used
tool: Bash
input_match: 'gh pr create[\s\S]*## Evidence|## Evidence[\s\S]*gh pr create'
min: 1
---
El cuerpo del PR trae la evidencia de la última verificación.
