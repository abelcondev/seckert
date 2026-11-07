export type Change = {
  slug: string
  status: 'proposed' | 'approved'
  done: number
  total: number
  next: string | null
  questions: number
  branch: string | null
  mtimeMs: number
}

export type Snapshot = {
  changes: Change[]
  branch: string | null
}

declare module 'claude-code' {
  interface PluginState {
    'seckert': { snapshot: Snapshot }
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
