#!/bin/sh
# Issue #1 aprobado, ruta FIX: el botón del checkout tiene que decir "Confirmar pedido".
set -e
here=$(cd "$(dirname "$0")" && pwd)
"$here/../_fixture/setup.sh"
"$here/../_fixture/issue.sh" 'Cambiar el texto del botón del checkout' FIX \
  'El botón del checkout dice "Enviar" y los clientes no saben si ya pagaron.' \
  'Ese botón tiene que decir que confirmás el pedido.' \
  'El botón del checkout dice "Confirmar pedido"' \
  'El cliente sabe que confirma el pedido al tocar el botón.'
