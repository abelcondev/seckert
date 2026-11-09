#!/bin/sh
# Change de cupones (dinero) terminado y verificado, en su rama, con un remoto local para el push.
set -e
here=$(cd "$(dirname "$0")" && pwd)
"$here/../_fixture/setup.sh"
git switch -qc feature/cupones
cat > src/cupones.ts <<'TS'
const CUPONES: Record<string, number> = { SECK10: 10 }

// devuelve el total con el cupón aplicado; un cupón desconocido no cambia el total
export function aplicarCupon(total: number, codigo: string): number {
  const porcentaje = CUPONES[codigo.trim().toUpperCase()] ?? 0
  return total - (total * porcentaje) / 100
}
TS
cat > tests/cupones.test.ts <<'TS'
import { expect, test } from 'bun:test'
import { aplicarCupon } from '../src/cupones'

test('SECK10 descuenta 10%', () => {
  expect(aplicarCupon(100, 'seck10')).toBe(90)
})

test('un cupón desconocido no cambia el total', () => {
  expect(aplicarCupon(100, 'NOEXISTE')).toBe(100)
})
TS
git add -A
git -c user.name=eval -c user.email=eval@seckert commit -qm "feat(cupones): aplicar cupón de descuento al total"
"$here/../_fixture/gh-repo.sh"
bun "$here/../_fixture/changes.ts" "$here/changes"
