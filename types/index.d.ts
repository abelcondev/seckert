// Tipos que el módulo del plugin (hooks/register.tsx) agrega a claude-code.
// La herramienta del MCP cuya aprobación vigila el módulo.
export type ApprovalTool = 'mcp__plugin_seckert_seckert__change_transition'

declare module 'claude-code' {
  // Las herramientas del servidor MCP del plugin (mcp/server.ts) que el módulo mira.
  interface McpToolInputs {
    'mcp__plugin_seckert_seckert__change_transition': {
      slug?: string
      to: 'approved' | 'done'
      aprobacion?: string
      pendientes?: boolean
    }
  }
}
