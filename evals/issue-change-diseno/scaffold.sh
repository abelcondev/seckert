#!/bin/sh
# issue #1 aprobado, ruta CHANGE (DESIGN=https://claude.ai/artifact/exportar-csv).
set -e
here=$(cd "$(dirname "$0")" && pwd)
"$here/../_fixture/setup.sh"
DESIGN=https://claude.ai/artifact/exportar-csv "$here/../_fixture/issue.sh" 'Exportar pedidos a CSV' CHANGE \
  'El contador necesita los pedidos del mes y hoy los copia a mano.' \
  'Necesito un botón que me baje todo en Excel a fin de mes.' \
  'Hay un botón "Exportar" que baja un CSV con fecha, cliente y total de cada pedido' \
  'Los pedidos del mes se bajan en un archivo con un clic.'
