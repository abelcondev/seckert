---
type: tool_used
tool: Bash
input_match: '(switch|checkout)\b[^\n]*?\s-[cb]\s+fix/'
min: 1
---
En gitflow, develop es protegida: el commit va en una rama fix/ creada desde develop.
