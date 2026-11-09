---
type: regex
pattern: '"name":\s*"Plan",\s*"body":\s*"(?:[^"\\]|\\.)*## (Open questions|Preguntas abiertas)\\n\\n- \S'
match: contains
target: {source: file, path: .gh.json}
---
El tercer fallo queda como pregunta abierta, con una recomendación.
