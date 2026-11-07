---
type: regex
pattern: '("name":"Write","input":\{"file_path":"[^"]*tests/precio|cat\s*>\s*tests/precio)[\s\S]*"name":"Edit","input":\{[^{]{0,80}"file_path":"[^"]*src/precio\.ts"'
match: contains
target: trace
---
Primero se crea el test del precio (con Write o desde Bash) y después se edita el código.
