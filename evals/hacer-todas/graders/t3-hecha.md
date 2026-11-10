---
type: regex
pattern: '- \[x\] T3 [^\\]*<!-- commit: [0-9a-f]{7,}'
match: contains
target: {source: file, path: .gh.json}
---
Con «todas», la T3 queda marcada en el plan con su commit (task_complete).
