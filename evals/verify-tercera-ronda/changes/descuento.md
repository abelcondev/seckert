---
status: approved
specs: [pedidos]
design: none
branch: feature/descuento
---

# Descuento en el total

## Why

El checkout tiene que poder aplicar un descuento porcentual al total.

## What

- Un descuento del 10% sobre un total de $100 deja el total en $90.

## Open questions

## Tasks

- [x] T1 Aplicar el descuento porcentual en `totalConDescuento` <!-- commit: a1b2c3d -->

## Testing

- Runner: `bun test`
- Nivel: risk
- Lógica: tests/precio.test.ts
- Presentación: no aplica

## Log

- **L1** (pedido original, verbatim): quiero aplicar un descuento en porcentaje al total
- 2026-10-29 verify: FALLA "Un descuento del 10% sobre un total de $100 deja el total en $90" (da 10). `bun test`: 1 fail. T1 reabierta.
- 2026-10-29: T1 rehecha (a1b2c3d).
- 2026-10-30 verify: FALLA "Un descuento del 10% sobre un total de $100 deja el total en $90" (da 10). `bun test`: 1 fail. T1 reabierta.
- 2026-10-30: T1 rehecha (a1b2c3d).
