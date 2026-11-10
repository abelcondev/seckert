---
type: regex
pattern: '"number":\s*1,[^{}]*"branches"'
match: not_contains
target: {source: file, path: .gh.json}
---
La feature padre no se trabaja directo: no tiene rama enlazada.
