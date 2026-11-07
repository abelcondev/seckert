---
type: regex
pattern: 'sdd/changes/[\s\S]*sdd/changes/'
match: contains
target: files
---
Un pedido con partes que sirven solas (cuentas, puntos, IA) se parte en varios changes: crea al menos dos archivos en sdd/changes.
