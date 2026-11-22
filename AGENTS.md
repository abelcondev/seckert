# seckert

Plugin de Claude Code. Ver [docs/desarrollo.md](docs/desarrollo.md).

## Commands
- Tests: `bun run test` (todo); `bun test mcp/` mientras se itera en el servidor MCP
- Lint: `bun run lint` (Biome; sin formatter)
- Typecheck: `bun run typecheck` (`mcp/` y `lib/`; `hooks/` y `tests/` solo con los tipos que escribe `claude --plugin-dir .`)

## Structure
- `skills/`, `agents/`, `hooks/`, `scripts/`: el plugin
- `mcp/` servidor MCP (el build va a `mcp/dist`), `lib/` lógica compartida
- `sdd/specs/` reglas vigentes; `evals/` casos de evaluación
