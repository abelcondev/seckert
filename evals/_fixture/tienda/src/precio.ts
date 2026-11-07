export type Item = { precio: number; cantidad: number }

export function subtotal(items: Item[]): number {
  return items.reduce((acc, i) => acc + i.precio * i.cantidad, 0)
}

// descuento en porcentaje: 10 = 10%
export function totalConDescuento(items: Item[], descuento: number): number {
  return subtotal(items) * (descuento / 100)
}
