#!/bin/sh
# Primera verificación: el envío gratis pasó y el express falló. Después hubo un commit que arregla el express.
set -e
here=$(cd "$(dirname "$0")" && pwd)
"$here/../_fixture/setup.sh"
"$here/../_fixture/gh-repo.sh"
bun "$here/../_fixture/changes.ts" "$here/changes"
git switch -qc feature/envio-express
cat >> src/envio.ts <<'TS'

export const COSTO_EXPRESS = 15

export function costoExpress(): number {
  return COSTO_EXPRESS
}
TS
cat > tests/express.test.ts <<'TS'
import { expect, test } from 'bun:test'
import { costoExpress } from '../src/envio'

test('el envío express cuesta 15', () => {
  expect(costoExpress()).toBe(15)
})
TS
git add -A
git -c user.name=eval -c user.email=eval@seckert commit -qm "fix(envio): el express cuesta 15"
