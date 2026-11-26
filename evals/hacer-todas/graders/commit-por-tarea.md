---
type: regex
pattern: '- \[x\] T1 [^\\]*<!-- commit: ([0-9a-f]{7,})[\s\S]*- \[x\] T2 [^\\]*<!-- commit: (?!\1)([0-9a-f]{7,})[\s\S]*- \[x\] T3 [^\\]*<!-- commit: (?!\1|\2)[0-9a-f]{7,}'
match: contains
target: {source: file, path: .gh.json}
---
Un commit por tarea, no uno solo al final: cada tarea tiene un hash distinto.
