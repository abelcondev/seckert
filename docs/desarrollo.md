# 🛠️ Desarrollo del plugin

[← Documentación](README.md)

Para quien modifica seckert:

```sh
claude --plugin-dir .         # probar el plugin local sin instalarlo
claude plugin validate .
bun run test                  # la suite completa: MCP, módulo y scripts de shell
bun run test:mcp              # solo el MCP (compila mcp/dist)
claude plugin test .          # solo el módulo: tests/*.test.ts (no bun test)
sh tests/find-chrome.sh       # solo scripts/find-chrome.sh
sh tests/guard-branch.sh      # solo el hook de ramas protegidas
claude plugin eval . …        # evals de comportamiento: ver evals/README.md
```

## Dónde está cada cosa

| Carpeta | Qué hay |
|---|---|
| `skills/` | Una skill por paso: `change`, `next`, `verify`, `done`, `design`, `hotfix`, `tomar`, `release`, `status` y las reglas en `workflow` |
| `agents/` | El verificador independiente (`seckert-verifier`) |
| `hooks/` | `hooks.json` y el módulo que corre dentro de Claude Code: guarda de aprobación y salidas recortadas |
| `scripts/` | Guardia de ramas protegidas, contexto de sesión, detección del flujo de ramas y búsqueda de Chrome |
| `mcp/` | Servidor MCP con las herramientas de issues, changes, tablero, verificación, PR y release |
| `evals/` | Evals de comportamiento: solo con seckert entre versiones, con y sin seckert en una release mayor |
