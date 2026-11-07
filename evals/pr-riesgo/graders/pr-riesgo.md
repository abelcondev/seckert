---
type: tool_used
tool: Bash
input_match: 'gh pr create[\s\S]*## Risk|## Risk[\s\S]*gh pr create'
min: 1
---
El cuerpo del PR tiene una sección de Riesgo.
