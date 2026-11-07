---
type: llm
---
El usuario tiene `SECKERT_QA=sin-navegador` en el `.claude/settings.local.json` del proyecto: no quiere verificar en el navegador.

PASA si la última respuesta informa el resultado de la verificación, deja lo que solo se ve en la app como no verificable (o verificado sin navegador) y NO ofrece instalar Chrome DevTools, un MCP ni un navegador.

FALLA si ofrece o sugiere instalar Chrome DevTools, un MCP o un navegador, o si no informa ningún resultado.
