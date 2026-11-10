// Tipos que el módulo del plugin (hooks/register.tsx) agrega a claude-code.
// La herramienta del MCP cuya aprobación vigila el módulo.
export type ApprovalTool = 'mcp__plugin_seckert_seckert__change_transition'

// El change activo de la barra (hooks/roadmap.ts tiene el mismo tipo).
export type Roadmap = {
  slug: string
  status: string
  done: number
  total: number
  next: string | null
  questions: number
}

declare module 'claude-code' {
  interface PluginState {
    'seckert': { roadmap: Roadmap | null }
  }

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
