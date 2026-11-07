import { expect, test } from 'claude-code/testing'

import { removeRule, rules, writeRule } from '../lib/spec'

const SPEC = `# Pedidos

## Envío gratis

Desde $50 el envío es gratis.

## Descuento

Un porcentaje sobre el subtotal.
`

test('lee las reglas, una por ##', () => {
  expect(rules(SPEC)).toEqual([
    { title: 'Envío gratis', body: 'Desde $50 el envío es gratis.' },
    { title: 'Descuento', body: 'Un porcentaje sobre el subtotal.' },
  ])
})

test('cambiar una regla reemplaza solo su cuerpo, sin historia', () => {
  const text = writeRule(SPEC, 'pedidos', 'Envío gratis', 'Desde $60 el envío es gratis.')
  expect(text).toBe(SPEC.replace('$50', '$60'))
})

test('una regla nueva va al final; un área nueva se crea con su título', () => {
  expect(writeRule(SPEC, 'pedidos', 'Cupones', 'Un cupón por pedido.')).toBe(`${SPEC}\n## Cupones\n\nUn cupón por pedido.\n`)
  expect(writeRule(null, 'pagos', 'Reintentos', 'Tres reintentos.', 'Pagos con tarjeta')).toBe(
    '# Pagos con tarjeta\n\n## Reintentos\n\nTres reintentos.\n',
  )
  expect(writeRule(null, 'pagos', 'Reintentos', 'Tres reintentos.')).toStartWith('# Pagos\n')
})

test('quitar una regla deja las demás; una que no existe falla', () => {
  expect(rules(removeRule(SPEC, 'Envío gratis'))).toEqual([{ title: 'Descuento', body: 'Un porcentaje sobre el subtotal.' }])
  expect(() => removeRule(SPEC, 'No existe')).toThrow('No existe')
})

test('el cuerpo no puede traer otro ## ni historia en el título', () => {
  expect(() => writeRule(SPEC, 'pedidos', 'Envío', 'a\n## Otra\nb')).toThrow('##')
})
