import { expect, test } from 'bun:test'
import { totalConDescuento } from '../src/precio'

test('10% de descuento sobre 100 da 90', () => {
  expect(totalConDescuento([{ precio: 100, cantidad: 1 }], 10)).toBe(90)
})
