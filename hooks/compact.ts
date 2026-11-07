// Recorta la salida de tests, builds y linters: deja los fallos con un poco de
// contexto y el resumen final, y quita las líneas de lo que pasó bien.

// Comandos cuya salida se recorta. `SECKERT_FULL=1` en el comando lo desactiva.
const NOISY = /\b(bun|npm|pnpm|yarn)\s+(run\s+)?(test|build|lint|typecheck|check)\b|\b(vitest|jest|pytest|playwright|tsc|eslint|biome|phpunit|rspec)\b|\bgo\s+(test|build|vet)\b|\bcargo\s+(test|build|clippy)\b|\bzig\s+build\b|\bbun\s+test\b/

const FAILURE = /\b(fail(ed|ure|ing)?|error|errors|exception|panic|traceback|assert(ion)?|expected|received|not ok)\b|✗|✘|×|✖|FAIL|ERR!|^\s+at\s+\S+.*:\d+/i

// Líneas de un test o paso que salió bien: no aportan ni en el resumen final.
const PASSING = /✓|✔|\(pass\)|^\s*(PASS|ok)\s|\bPASSED\b/

export const MIN_LINES = 80
const CONTEXT_AFTER = 4
const TAIL = 15
const MAX_KEPT = 150

export function shouldCompact(command: string, output: string): boolean {
  if (/\bSECKERT_FULL=1\b/.test(command) || !NOISY.test(command)) return false
  return output.split('\n').length > MIN_LINES
}

export function compact(output: string): string {
  const lines = output.split('\n')
  const keep = new Set<number>()

  lines.forEach((line, index) => {
    if (!FAILURE.test(line)) return
    for (let i = index; i <= Math.min(index + CONTEXT_AFTER, lines.length - 1); i++) keep.add(i)
  })
  // El resumen: las últimas líneas que no son de tests que pasaron.
  let tail = 0
  for (let i = lines.length - 1; i >= 0 && tail < TAIL; i--) {
    if (PASSING.test(lines[i] ?? '')) continue
    keep.add(i)
    tail++
  }

  const kept: string[] = []
  let previous = -1
  for (const index of [...keep].sort((a, b) => a - b)) {
    if (kept.length >= MAX_KEPT) break
    if (index > previous + 1) kept.push('…')
    kept.push(lines[index] ?? '')
    previous = index
  }

  const header = `[seckert: salida de ${lines.length} líneas recortada a ${kept.length}: fallos con contexto y resumen final. Para verla entera, repite el comando con SECKERT_FULL=1 delante.]`
  return [header, ...kept].join('\n')
}
