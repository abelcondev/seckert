---
type: regex
pattern: 'Rama feature/exportar-pedidos (desde|ya existía)'
match: contains
target: {source: file, path: sdd/changes/2026-10-28-exportar-pedidos.md}
---
Al aprobar se crea la rama del change desde la base: change_transition lo anota en el Log del change. Se mira el archivo y no la traza, porque Claude ya no relee el change después de aprobarlo.
