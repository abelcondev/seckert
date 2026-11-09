#!/bin/sh
# Con tablero: dos issues en el cycle actual (uno urgente), uno en el siguiente y uno sin cycle.
set -e
here=$(cd "$(dirname "$0")" && pwd)
"$here/../_fixture/setup.sh"
"$here/../_fixture/gh-repo.sh"
node "$here/../_fixture/issues.mjs" '[{"title":"Botón de exportar","route":"FIX","problem":"p","outcome":"o","criteria":["c"]},{"title":"Cobro con tarjeta","route":"CHANGE","problem":"p","outcome":"o","criteria":["c"]},{"title":"Cupones","route":"CHANGE","problem":"p","outcome":"o","criteria":["c"]},{"title":"Typo del footer","route":"FIX","problem":"p","outcome":"o","criteria":["c"]}]'
node "$here/../_fixture/board.mjs" '[{"issue":1,"status":"Approved","priority":"Low","size":"S","cycle":1},{"issue":2,"status":"In Progress","priority":"Urgent","size":"L","cycle":1},{"issue":3,"status":"Approved","priority":"High","cycle":2},{"issue":4,"status":"Draft"}]'
