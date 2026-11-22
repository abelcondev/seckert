# seckert

Plugin de Claude Code. Ver [docs/desarrollo.md](docs/desarrollo.md).

## Commands
- Tests: `bun run test` (todo); `bun test mcp/` mientras se itera en el servidor MCP
- Lint: `bun run lint` (Biome; sin formatter)
- Typecheck: `bun run typecheck` (`tsc -p mcp`, cubre `mcp/` y `lib/`)

## Structure
- `skills/`, `agents/`, `hooks/`, `scripts/`: el plugin
- `mcp/` servidor MCP (el build va a `mcp/dist`), `lib/` lógica compartida
- `sdd/specs/` reglas vigentes; `evals/` casos de evaluación
