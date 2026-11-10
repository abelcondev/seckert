#!/bin/sh
# change total-del-pedido aprobado, con 3 tareas pendientes y su rama creada.
set -e
here=$(cd "$(dirname "$0")" && pwd)
"$here/../_fixture/setup.sh"
"$here/../_fixture/gh-repo.sh"
bun "$here/../_fixture/changes.ts" "$here/changes"
git switch -qc feature/total-del-pedido
