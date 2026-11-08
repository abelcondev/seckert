---
type: tool_used
tool: Bash
input_match: 'Fixes #1\\n\\n## Why[\s\S]*gh pr create|gh pr create[\s\S]*Fixes #1'
min: 1
---
El PR se arma con el cuerpo de pr_draft, que empieza con Fixes #1: el issue pasa a in-review y el merge lo cierra. Se mira el comando y no el resultado: en el sandbox, el Bash de Claude no ve el gh falso y gh pr create falla sin sesión.
