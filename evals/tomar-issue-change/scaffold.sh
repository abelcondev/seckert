#!/bin/sh
# Issue #1 aprobado, ruta CHANGE: exportar los pedidos a CSV.
set -e
here=$(cd "$(dirname "$0")" && pwd)
"$here/../_fixture/setup.sh"
"$here/../_fixture/issue.sh" 'Exportar pedidos a CSV' CHANGE \
  'El cliente quiere bajar los pedidos del mes para su contador.' \
  'Necesito un botón que me baje todo en Excel a fin de mes.' \
  'Hay un botón "Exportar" que baja un CSV con fecha, cliente y total de cada pedido'
