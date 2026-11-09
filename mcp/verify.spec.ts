// verify_record: la línea verify con formato fijo, reabrir tareas y el tope de 3 rondas.
import { afterAll, beforeAll, expect, test } from 'bun:test'

import { fixture, type Fixture } from './fixture'

const TODAY = new Date().toLocaleDateString('sv-SE', { timeZone: 'UTC' })
const DESCUENTO = 'Un descuento del 10% sobre un total de $100 deja el total en $90.'
const CODIGO = 'Un código desconocido no cambia el total'

const change = (log: string) => `---
status: approved
specs: []
design: none
branch: feature/x
---

# Descuento

## Why

x

## What

- ${DESCUENTO}
- ${CODIGO}

## Preguntas abiertas

- **P1** ¿Tope?

## Tasks

- [x] T1 Descuento <!-- commit: a1b2c3d -->
- [x] T2 Código <!-- commit: b2c3d4e -->

## Log

- **L1** (pedido original, verbatim): x
${log}`

let fx: Fixture
type Result = { isError?: boolean; content: { text: string }[] }

// Cada caso es un change propio en su issue (rama feature/<slug>).
const write = (slug: string, log: string) => fx.seedChange(change(log).replace('branch: feature/x', `branch: feature/${slug}`))
const read = (slug: string) => fx.changeText(slug)
const record = async (args: Record<string, unknown>) => (await fx.client.callTool({ name: 'verify_record', arguments: args })) as Result
const json = (result: Result) => JSON.parse(result.content[0]!.text)

beforeAll(async () => {
  fx = await fixture('seckert-mcp-v-')
})

afterAll(async () => {
  await fx?.close()
})

test('primer fallo: escribe la línea verify con formato fijo y reabre la tarea', async () => {
  write('uno', '')
  const result = json(
    await record({
      slug: 'uno',
      filas: [
        { punto: DESCUENTO, veredicto: 'FALLA', evidencia: 'da 10', tareas: ['T1'] },
        { punto: CODIGO, veredicto: 'PASA', evidencia: 'bun test' },
      ],
      comandos: ['bun test'],
    }),
  )
  expect(result).toMatchObject({ reabiertas: ['T1'], tercera_vez: [] })
  const text = read('uno')
  expect(text).toContain(
    `- ${TODAY} verify: FALLA "${DESCUENTO.slice(0, -1)}" (da 10); PASA "${CODIGO}". Comandos: \`bun test\`. T1 reabierta.`,
  )
  expect(text).toContain('- [ ] T1 Descuento <!-- commit: a1b2c3d -->')
  expect(text).toContain('- [x] T2 Código')
})

test('tercer fallo del mismo punto, aunque una ronda vieja diga "verify (2ª ronda):": no reabre y deja la pregunta con el número siguiente', async () => {
  write(
    'tres',
    `- 2026-10-29 verify: FALLA "${DESCUENTO}" (da 10). T1 reabierta.\n- 2026-10-30 verify (2ª ronda): FALLA "${DESCUENTO}" (da 10). T1 reabierta.\n`,
  )
  const result = json(
    await record({
      slug: 'tres',
      filas: [{ punto: DESCUENTO, veredicto: 'FALLA', evidencia: 'da 10', tareas: ['T1'], recomendacion: 'Calcular en centavos' }],
    }),
  )
  expect(result.reabiertas).toEqual([])
  expect(result.tercera_vez).toEqual([{ punto: DESCUENTO.slice(0, -1), pregunta: 'P2' }])
  const text = read('tres')
  expect(text).toContain('- [x] T1 Descuento')
  expect(text).toContain(`- **P2** "${DESCUENTO.slice(0, -1)}" falló 3 veces: ¿cambiamos el enfoque? Recomendación: Calcular en centavos`)
  expect(text).toContain('3.ª vez: no se reabre, queda en P2.')
})

test('PREEXISTENTE va a la línea y no reabre nada', async () => {
  write('pre', '')
  const result = json(
    await record({
      slug: 'pre',
      filas: [{ punto: DESCUENTO, veredicto: 'PASA' }, { punto: CODIGO, veredicto: 'PASA' }],
      preexistentes: ['tests/envio.spec.ts'],
    }),
  )
  expect(result.reabiertas).toEqual([])
  expect(read('pre')).toContain(`PREEXISTENTE: tests/envio.spec.ts.`)
})

test('un punto que no está en el What se rechaza y nombra los que hay; "Diseño" se acepta', async () => {
  write('nombres', '')
  const bad = await record({ slug: 'nombres', filas: [{ punto: 'El descuento funciona', veredicto: 'FALLA', tareas: ['T1'] }] })
  expect(bad.isError).toBe(true)
  expect(bad.content[0]!.text).toContain(CODIGO)
  expect(read('nombres')).not.toContain('verify:')

  const ok = await record({ slug: 'nombres', filas: [{ punto: 'Diseño', veredicto: 'VISUAL', evidencia: 'contra el artifact' }] })
  expect(ok.isError).toBeUndefined()
})

test('un FALLA sin tareas que reabrir se rechaza', async () => {
  write('sin', '')
  const bad = await record({ slug: 'sin', filas: [{ punto: CODIGO, veredicto: 'FALLA', evidencia: 'x' }] })
  expect(bad.isError).toBe(true)
  expect(bad.content[0]!.text).toContain('tareas')
})
