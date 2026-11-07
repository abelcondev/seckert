import { expect, test } from 'claude-code/testing'

import { compact, shouldCompact } from '../hooks/compact'

const passing = Array.from({ length: 300 }, (_, i) => `(pass) caso ${i}`)
const failing = [
  ...passing.slice(0, 150),
  '(fail) total con descuento',
  '  Expected: 90',
  '  Received: 100',
  '      at tests/precio.test.ts:12:5',
  ...passing.slice(150),
  ' 299 pass',
  ' 1 fail',
].join('\n')

test('solo recorta comandos ruidosos con salida larga', () => {
  expect(shouldCompact('bun test ./tests', failing)).toBe(true)
  expect(shouldCompact('cd web && npm run build', failing)).toBe(true)
  expect(shouldCompact('git log', failing)).toBe(false)
  expect(shouldCompact('bun test ./tests', '(pass) uno\n 1 pass')).toBe(false)
  expect(shouldCompact('SECKERT_FULL=1 bun test ./tests', failing)).toBe(false)
})

test('deja el fallo con su contexto y el resumen, sin las líneas que pasaron', () => {
  const out = compact(failing)
  expect(out).toContain('(fail) total con descuento')
  expect(out).toContain('  Received: 100')
  expect(out).toContain('tests/precio.test.ts:12:5')
  expect(out).toContain(' 1 fail')
  expect(out).not.toContain('(pass) caso 10\n')
  expect(out.split('\n').length).toBeLessThan(30)
  expect(out.split('\n')[0]).toContain('SECKERT_FULL=1')
})

test('una salida exitosa larga llega recortada al modelo', async ($, on) => {
  const stdout = passing.join('\n') + '\n 300 pass\n 0 fail'
  on('tool.call', () => ({ result: { stdout, stderr: '', interrupted: false } }))

  const ran = await $.tool.call({ tool: 'Bash', command: 'bun test ./tests' })
  if (ran.deny !== undefined || ran.isError === true) throw new Error('se esperaba un resultado')
  expect(ran.result.stdout).toContain(' 300 pass')
  expect(ran.result.stdout).not.toContain('(pass) caso')
  expect(ran.result.stdout.split('\n').length).toBeLessThan(10)
})

test('tests que fallan llegan recortados en lugar del error completo', async ($, on) => {
  on('tool.call', () => ({ isError: true as const, result: failing, text: failing }))

  const ran = await $.tool.call({ tool: 'Bash', command: 'bun test ./tests' })
  expect(ran.deny).toContain('(fail) total con descuento')
  expect(ran.deny?.split('\n').length).toBeLessThan(30)
})

test('otros comandos no se tocan', async ($, on) => {
  const stdout = passing.join('\n')
  on('tool.call', () => ({ result: { stdout, stderr: '', interrupted: false } }))

  const ran = await $.tool.call({ tool: 'Bash', command: 'cat lista.txt' })
  if (ran.deny !== undefined || ran.isError === true) throw new Error('se esperaba un resultado')
  expect(ran.result.stdout).toBe(stdout)
})
