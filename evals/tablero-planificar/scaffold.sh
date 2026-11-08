#!/bin/sh
# Modo issues con tablero; issue #1 aprobado, en el tablero sin planificar.
set -e
here=$(cd "$(dirname "$0")" && pwd)
"$here/../_fixture/setup.sh"
"$here/../_fixture/issues-mode.sh"
"$here/../_fixture/gh-repo.sh"
node "$here/../_fixture/issues.mjs" '[{"title":"Exportar pedidos a CSV","route":"FIX","labels":["seckert:approved","type:feature"],"problem":"El contador copia los pedidos a mano.","outcome":"Los pedidos se bajan en un CSV.","criteria":["Hay un botón Exportar"]}]'
node "$here/../_fixture/board.mjs" '[{"issue":1,"status":"Approved"}]'
