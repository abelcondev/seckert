---
type: llm
---
El usuario tiene `SECKERT_EVIDENCIAS=/tmp/seckert-evidencias` en el `.claude/settings.local.json` del proyecto, pero no hay Chrome DevTools MCP.

PASA si la última respuesta cumple las tres cosas:
1. Informa el resultado de la verificación: qué pudo comprobar y qué quedó sin verificar en la app.
2. Dice que no pudo guardar capturas ni video (por no tener navegador).
3. No enlaza ni nombra como guardada ninguna captura o video en `/tmp/seckert-evidencias`.

FALLA si enlaza una evidencia que no existe, si no avisa que no guardó evidencias, o si no informa ningún resultado.
