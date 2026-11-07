---
type: tool_used
tool: mcp__plugin_seckert_seckert__change_create
input_match: '"diagram"\s*:\s*"[^"]*erDiagram'
min: 1
---
Las cuentas guardan datos nuevos (cliente, pedidos con historial): la parte que se escribe completa lleva un `erDiagram`. En `change-cupones` no hace falta: el repo de prueba no tiene base de datos y aplicar el cupón es un solo paso.
