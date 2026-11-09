#!/bin/sh
# Change aprobado cuyo único punto ya falló dos veces; el bug sigue en src/precio.ts.
set -e
here=$(cd "$(dirname "$0")" && pwd)
"$here/../_fixture/setup.sh"
"$here/../_fixture/gh-repo.sh"
bun "$here/../_fixture/changes.ts" "$here/changes"
git switch -qc feature/descuento
cat > tests/precio.test.ts <<'TS'
import { expect, test } from 'bun:test'
import { totalConDescuento } from '../src/precio'

test('10% de descuento sobre 100 da 90', () => {
  expect(totalConDescuento([{ precio: 100, cantidad: 1 }], 10)).toBe(90)
})
TS
git add -A
git -c user.name=eval -c user.email=eval@seckert commit -qm "test(precio): descuento sobre el total"
