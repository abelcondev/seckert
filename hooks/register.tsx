import type { Register } from 'claude-code'

import { compact, shouldCompact } from './compact'

// Orígenes de un mensaje escrito por el usuario.
const HUMAN = new Set(['composer', 'bridge', 'sdk'])

// Para comparar palabras sin que importen mayúsculas, tildes ni puntuación.
function words(text: string): string {
  return ` ${text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim()} `
}

// change_transition del servidor MCP de seckert (mcp__plugin_seckert_seckert__change_transition).
const TRANSITION = 'mcp__plugin_seckert_seckert__change_transition'

// Solo el usuario aprueba y cierra: las palabras que el modelo pasa como
// `aprobacion` tienen que estar en el último mensaje que el usuario escribió.
export function approvalProblem(aprobacion: unknown, lastPrompt: string | null): string | null {
  const said = typeof aprobacion === 'string' ? words(aprobacion) : ' '
  if (said.trim() === '') return 'falta `aprobacion` con las palabras del usuario'
  if (lastPrompt === null || !words(lastPrompt).includes(said))
    return `"${String(aprobacion).trim()}" no está en el último mensaje del usuario`
  return null
}

export const register: Register = on => {
  // El último mensaje que escribió el usuario: contra él se comprueba una aprobación.
  let lastPrompt: string | null = null

  on('prompt.submit', async ($, e, next) => {
    // Solo lo que escribe una persona: terminal, Remote Control o `claude -p`.
    // Los avisos de tareas en segundo plano y otros orígenes no cuentan.
    if (!e.isMeta && HUMAN.has(e.origin?.kind ?? '')) lastPrompt = e.text
    return next(e)
  })

  on('tool.call', { tool: TRANSITION }, async ($, e, next) => {
    const problem = approvalProblem(e.aprobacion, lastPrompt)
    return problem === null
      ? next(e)
      : { deny: `seckert: ${problem}. Solo el usuario aprueba o cierra un change: preguntale y usá sus palabras textuales.` }
  })

  on('session.end', async ($, e, next) => {
    lastPrompt = null
    return next(e)
  })

  // Tests, builds y linters: Claude recibe los fallos y el resumen, no miles de
  // líneas en verde que se pagarían en cada turno siguiente.
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    try {
      if (ran.deny !== undefined) return ran

      // Con error (p.ej. tests que fallan) solo se puede reemplazar el texto
      // entero: se devuelve como deny, que el modelo lee en lugar del original.
      if (ran.isError === true) {
        const text = ran.text ?? ''
        return shouldCompact(e.command, text) ? { deny: compact(text) } : ran
      }

      const { stdout } = ran.result
      return shouldCompact(e.command, stdout) ? { result: { ...ran.result, stdout: compact(stdout) } } : ran
    } catch {
      return ran
    }
  })
}
