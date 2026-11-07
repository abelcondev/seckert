---
status: approved
specs: [pedidos]
design: none
branch: feature/envio-express
---

# Envío express

## Why

Algunos clientes pagan más por recibir el pedido en el día.

## What

- El envío express cuesta $15, sin importar el subtotal.

## Open questions

## Tasks

- [x] T1 `costoExpress` en `src/envio.ts`, con test <!-- commit: c7d8e9f -->

## Testing

- Runner: `bun test`
- Nivel: risk
- Lógica: tests/express.test.ts
- Presentación: no aplica

## Log

- **L1** (pedido original, verbatim): quiero ofrecer envío express a $15
- 2026-10-29: aprobado.
