import { costoEnvio } from './envio'
import { subtotal, type Item } from './precio'

export function Checkout({ items, onConfirmar }: { items: Item[]; onConfirmar: () => void }) {
  const sub = subtotal(items)
  return (
    <section>
      <p>Subtotal: ${sub}</p>
      <p>Envío: ${costoEnvio(sub)}</p>
      <button onClick={onConfirmar}>Enviar</button>
    </section>
  )
}
