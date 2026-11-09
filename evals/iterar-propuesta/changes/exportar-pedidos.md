---
status: proposed
specs: [pedidos]
design: none
branch: feature/exportar-pedidos
---

# Exportar pedidos a CSV

## Why

El equipo de ventas arma a mano la planilla de pedidos del mes.

## What

- Desde la lista de pedidos se descarga un CSV con fecha, items y total.

## Open questions

## Tasks

- [ ] T1 Generar el CSV a partir de los pedidos <!-- commit: -->
- [ ] T2 Endpoint de descarga <!-- commit: -->
- [ ] T3 Botón "Exportar" en la lista <!-- commit: -->

## Testing

- Runner: `bun test`
- Nivel: risk
- Lógica: tests/csv.test.ts
- Presentación: no aplica

## Log

- **L1** (pedido original, verbatim): quiero exportar los pedidos a CSV
