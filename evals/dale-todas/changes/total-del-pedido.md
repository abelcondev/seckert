---
status: proposed
specs: [pedidos]
design: none
branch: feature/total-del-pedido
---

# Total del pedido

## Why

El checkout muestra el subtotal y el envío, pero no el total que paga el cliente.

## What

- El checkout muestra el total: subtotal más envío.
- El total se calcula en un módulo con test.

## Open questions

## Tasks

- [ ] T1 `totalPedido(items)` en `src/total.ts`: subtotal más envío, con test <!-- commit: -->
- [ ] T2 `faltaParaEnvioGratis(subtotal)` en `src/envio.ts`: cuánto falta para los 50, con test <!-- commit: -->
- [ ] T3 El checkout muestra el total y cuánto falta para el envío gratis <!-- commit: -->

## Testing

- Runner: `bun test`
- Nivel: risk
- Lógica: tests/total.test.ts, tests/envio.spec.ts
- Presentación: no aplica

## Log

- **L1** (pedido original, verbatim): quiero que el checkout muestre el total
