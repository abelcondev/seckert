---
type: regex
pattern: '"branches":\s*\[\s*"fix/'
match: contains
target: {source: file, path: .gh.json}
---
El issue queda con una rama fix/ enlazada: GitHub lo muestra in-progress.
