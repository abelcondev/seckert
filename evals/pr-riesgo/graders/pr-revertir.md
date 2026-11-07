---
type: tool_used
tool: Bash
input_match: 'gh pr create[\s\S]*## How to revert|## How to revert[\s\S]*gh pr create'
min: 1
---
El cuerpo del PR dice cómo revertir.
