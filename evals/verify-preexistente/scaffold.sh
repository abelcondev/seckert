#!/bin/sh
# main ya tiene un test roto (descuento). El change de envío express está bien hecho y no lo toca.
set -e
here=$(cd "$(dirname "$0")" && pwd)
"$here/../_fixture/setup.sh" "$here/overlay"
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
git -c user.name=eval -c user.email=eval@seckert commit -qm "feat(envio): envío express"
