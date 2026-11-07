---
type: regex
pattern: '\(1\s*-\s*descuento\s*/\s*100\)|100\s*-\s*descuento|-\s*subtotal\(items\)\s*\*\s*\(?descuento\s*/\s*100'
match: contains
target: {source: file, path: src/precio.ts}
---
La fórmula aplica el descuento restándolo del subtotal.
