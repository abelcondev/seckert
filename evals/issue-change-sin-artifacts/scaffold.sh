#!/bin/sh
# Modo issues; issue #1 aprobado, ruta CHANGE (NO_ARTIFACTS=1).
set -e
here=$(cd "$(dirname "$0")" && pwd)
"$here/../_fixture/setup.sh"
"$here/../_fixture/issues-mode.sh"
NO_ARTIFACTS=1 "$here/../_fixture/issue.sh" 'Exportar pedidos a CSV' CHANGE \
  'El contador necesita los pedidos del mes y hoy los copia a mano.' \
  'Necesito un botón que me baje todo en Excel a fin de mes.' \
  'Hay un botón "Exportar" que baja un CSV con fecha, cliente y total de cada pedido' \
  'Los pedidos del mes se bajan en un archivo con un clic.'
