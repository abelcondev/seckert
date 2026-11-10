---
type: regex
pattern: '- \[x\] T1 [^\\]*<!-- commit: [0-9a-f]{7,}'
match: contains
target: {source: file, path: .gh.json}
---
Con «todas», la T1 queda marcada en el plan con su commit (task_complete).
