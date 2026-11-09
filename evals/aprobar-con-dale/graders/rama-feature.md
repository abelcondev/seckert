---
type: regex
pattern: '"name":\s*"Plan",\s*"body":\s*"(?:[^"\\]|\\.)*Rama feature/exportar-pedidos (desde|ya existía)'
match: contains
target: {source: file, path: .gh.json}
---
Al aprobar se crea la rama del change desde la base: change_transition lo anota en el Log del plan. Se mira el issue y no la traza, porque Claude ya no relee el change después de aprobarlo.
