// Métricas de eficiencia de una corrida de `claude plugin eval --keep-temp --json <archivo>`:
// palabras de la respuesta final, palabras por frase, tokens de salida, contexto leído, segundos y costo, con y sin seckert.
// Uso: bun evals/metrics.ts <archivo.json>
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'

type Run = { costUsd: number; durationSeconds: number; turns: number; tracePath?: string }
type Case = { name: string; arms: Record<string, Run[]> }

const file = process.argv[2]
if (!file) throw new Error('uso: bun evals/metrics.ts <archivo.json>')
const result = JSON.parse(readFileSync(file, 'utf8')) as { cases: Case[] }
const traces = join(dirname(file), basename(file, '.json') + '-traces')

function readTrace(path: string) {
  // --keep-temp deja la carpeta de la corrida en solo lectura; out/ se puede leer al reabrirla.
  try { chmodSync(dirname(dirname(path)), 0o700) } catch {}
  if (!existsSync(path)) return null
  const events = readFileSync(path, 'utf8').trim().split('\n').map(l => JSON.parse(l))
  const final = events.findLast(e => e.type === 'result')
  const lastText = events
    .filter(e => e.type === 'assistant')
    .flatMap(e => e.message.content)
    .findLast((b: { type: string }) => b.type === 'text')?.text ?? ''
  const u = final?.usage ?? {}
  return {
    words: lastText.split(/\s+/).filter(Boolean).length,
    perSentence: wordsPerSentence(lastText),
    outputTokens: u.output_tokens ?? 0,
    contextTokens: (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0),
  }
}

// Palabras por frase de la respuesta final, sin bloques de código ni filas de tabla: solo informa
// (la regla de redacción de seckert es una guía de ~20, ningún grader falla por el largo).
function wordsPerSentence(text: string): number {
  const prose = text
    .replace(/```[\s\S]*?```/g, '')
    .split('\n')
    .filter(line => !/^\s*\|/.test(line))
    .join('\n')
  const sentences = prose
    .split(/[.!?;:]+(?=\s|$)|\n+/)
    .map(s => s.replace(/^\s*([-*]|\d+\.)\s+/, '').split(/\s+/).filter(Boolean).length)
    .filter(n => n > 0)
  return sentences.length ? sentences.reduce((a, b) => a + b, 0) / sentences.length : NaN
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN)
const fmt = (n: number, d = 0) => (Number.isNaN(n) ? '–' : n.toLocaleString('es-AR', { maximumFractionDigits: d, minimumFractionDigits: d }))

mkdirSync(traces, { recursive: true })
const rows: string[] = []
const totals: Record<string, Record<string, number[]>> = {}

for (const c of result.cases) {
  const cols: Record<string, Record<string, number>> = {}
  for (const [arm, runs] of Object.entries(c.arms)) {
    const m = runs.map((r, i) => {
      const t = r.tracePath ? readTrace(r.tracePath) : null
      if (t && r.tracePath) copyFileSync(r.tracePath, join(traces, `${c.name}-${arm}-${i}.jsonl`))
      return { ...t, seconds: r.durationSeconds, cost: r.costUsd }
    })
    cols[arm] = Object.fromEntries(
      (['words', 'perSentence', 'outputTokens', 'contextTokens', 'seconds', 'cost'] as const).map(k => [k, mean(m.map(x => x[k] ?? NaN).filter(x => !Number.isNaN(x)))]),
    )
    for (const [k, v] of Object.entries(cols[arm])) ((totals[arm] ??= {})[k] ??= []).push(v)
  }
  const pair = (k: string, d = 0, pre = '') => `${pre}${fmt(cols.with?.[k] ?? NaN, d)} / ${pre}${fmt(cols.without?.[k] ?? NaN, d)}`
  rows.push(`| \`${c.name}\` | ${pair('words')} | ${pair('perSentence', 1)} | ${pair('outputTokens')} | ${pair('contextTokens')} | ${pair('seconds')} | ${pair('cost', 2, '$')} |`)
}

const avg = (arm: string, k: string, d = 0, pre = '') => `${pre}${fmt(mean(totals[arm]?.[k] ?? []), d)}`
console.log('| Caso | Palabras de la respuesta | Palabras por frase | Tokens de salida | Contexto leído | Segundos | Costo |')
console.log('|---|---|---|---|---|---|---|')
console.log(rows.join('\n'))
console.log(`| **Promedio** | ${avg('with', 'words')} / ${avg('without', 'words')} | ${avg('with', 'perSentence', 1)} / ${avg('without', 'perSentence', 1)} | ${avg('with', 'outputTokens')} / ${avg('without', 'outputTokens')} | ${avg('with', 'contextTokens')} / ${avg('without', 'contextTokens')} | ${avg('with', 'seconds')} / ${avg('without', 'seconds')} | ${avg('with', 'cost', 2, '$')} / ${avg('without', 'cost', 2, '$')} |`)
console.log(`\nCada celda: con seckert / sin seckert, promedio por corrida. Trazas copiadas en ${traces}`)
