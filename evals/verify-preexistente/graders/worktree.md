---
type: regex
pattern: 'git[^\n]*worktree add|tests_on_base'
match: contains
target: trace
---
El test que falla se comprueba en la base, en un worktree temporal (a mano o con la herramienta tests_on_base).
