import { expect, test } from 'bun:test'
import { costoEnvio } from '../src/envio'

test('cobra envío por debajo del mínimo', () => {
  expect(costoEnvio(20)).toBe(8)
})
