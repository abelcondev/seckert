---
status: approved
specs: [pedidos]
design: none
branch: feature/boton-confirmar
---

# Botón "Confirmar pedido"

## Why

"Enviar" confunde: los clientes creen que envía un mensaje.

## What

- En el checkout, el botón para terminar la compra dice "Confirmar pedido".
- Al tocarlo se confirma el pedido, igual que antes.

## Open questions

## Tasks

- [x] T1 Cambiar el texto del botón en `src/Checkout.tsx` <!-- commit: d1e2f3a -->

## Testing

- Runner: `bun test`
- Nivel: risk
- Lógica: no aplica
- Presentación: verificar en la app

## Log

- **L1** (pedido original, verbatim): que el botón del checkout diga "Confirmar pedido"
- 2026-10-29: aprobado.
