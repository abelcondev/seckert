---
type: regex
pattern: '## Plan\\n\\n<!-- seckert:plan\\nstatus: proposed'
match: contains
target: {source: file, path: .gh.json}
---
Sin la API de artifacts, el plan va en la sección ## Plan del body.
