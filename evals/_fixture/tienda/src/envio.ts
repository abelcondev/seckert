export const ENVIO_GRATIS_DESDE = 50
export const COSTO_ENVIO = 8

export function costoEnvio(subtotal: number): number {
  return subtotal >= ENVIO_GRATIS_DESDE ? 0 : COSTO_ENVIO
}
