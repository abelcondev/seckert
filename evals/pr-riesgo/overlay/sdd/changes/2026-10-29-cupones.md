---
status: approved
specs: [pedidos]
design: none
branch: feature/cupones
---

# Cupones de descuento

## Why

Marketing quiere repartir códigos de descuento.

## What

- El cliente escribe un código de cupón y se le descuenta su porcentaje del total.
- Un código desconocido no cambia el total.

## Open questions

## Tasks

- [x] T1 (dinero) `aplicarCupon` con el porcentaje de cada cupón, test primero <!-- commit: b4c5d6e -->

## Testing

- Runner: `bun test`
- Nivel: risk
- Lógica: tests/cupones.test.ts
- Presentación: no aplica

## Log

- **L1** (pedido original, verbatim): quiero cupones de descuento en el checkout
- 2026-10-29: aprobado.
- 2026-10-30 verify: PASA "El cliente escribe un código de cupón y se le descuenta su porcentaje del total"; PASA "Un código desconocido no cambia el total". `bun test`: 3 pass, 0 fail.
