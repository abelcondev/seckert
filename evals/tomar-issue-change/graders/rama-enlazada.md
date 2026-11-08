---
type: regex
pattern: '"branches":\s*\[\s*"feature/exportar-pedidos-a-csv"'
match: contains
target: {source: file, path: .gh.json}
---
El issue queda con la rama feature/ enlazada: GitHub lo muestra in-progress.
