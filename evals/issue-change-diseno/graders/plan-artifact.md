---
type: regex
pattern: '"type":\s*"plan",\s*"name":\s*"Plan",\s*"body":\s*"<!-- seckert:plan\\nstatus: proposed'
match: contains
target: {source: file, path: .gh.json}
---
El plan queda como artifact Plan del issue, en proposed hasta el «dale».
