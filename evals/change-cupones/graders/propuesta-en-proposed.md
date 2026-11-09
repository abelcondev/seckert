---
type: regex
pattern: 'seckert:plan\\nstatus: proposed|"seckert:draft"'
match: contains
target: {source: file, path: .gh.json}
---
Nada queda aprobado sin el «sí»: el plan nace en proposed o, con preguntas abiertas, el issue queda en draft.
