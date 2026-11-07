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

- Los pedidos desde $50 siguen teniendo envío gratis.
- El envío express cuesta $15, sin importar el subtotal.

## Open questions

## Tasks

- [x] T1 Mantener el envío gratis desde $50 <!-- commit: a0a0a0a -->
- [x] T2 `costoExpress` en `src/envio.ts`, con test <!-- commit: b1b1b1b -->

## Testing

- Runner: `bun test`
- Nivel: risk
- Lógica: tests/envio.spec.ts, tests/express.test.ts
- Presentación: no aplica

## Log

- **L1** (pedido original, verbatim): quiero ofrecer envío express a $15 sin perder el envío gratis
- 2026-10-29: aprobado.
- 2026-10-30 verify: PASA "Los pedidos desde $50 siguen teniendo envío gratis."; FALLA "El envío express cuesta $15, sin importar el subtotal." (`costoExpress` no existía). `bun test`: 1 pass. T2 reabierta.
- 2026-10-30: T2 rehecha (b1b1b1b).
