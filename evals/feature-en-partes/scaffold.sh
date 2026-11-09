#!/bin/sh
# feature #1 aprobada, grande: modelo de datos, flujo y pantalla.
set -e
here=$(cd "$(dirname "$0")" && pwd)
"$here/../_fixture/setup.sh"
"$here/../_fixture/gh-repo.sh"
node "$here/../_fixture/issues.mjs" '[{"title":"Cuentas de cliente","route":"CHANGE","labels":["seckert:approved","type:feature"],"problem":"Los clientes compran sin cuenta y tienen que cargar sus datos en cada pedido.","outcome":"Un cliente se registra, inicia sesión y ve su historial de pedidos.","criteria":["Un cliente se registra con email y contraseña, que se guarda hasheada","Un cliente registrado inicia sesión y el checkout usa sus datos guardados","Hay una pantalla Mis pedidos con el historial del cliente"]}]'
