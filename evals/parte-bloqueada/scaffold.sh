#!/bin/sh
# feature #1 con dos partes: #3 está bloqueada por #2, que sigue abierta.
set -e
here=$(cd "$(dirname "$0")" && pwd)
"$here/../_fixture/setup.sh"
"$here/../_fixture/gh-repo.sh"
node "$here/../_fixture/issues.mjs" '[{"title":"Cobrar con tarjeta","route":"CHANGE","labels":["seckert:approved","type:feature"],"problem":"Solo se paga por transferencia.","outcome":"El cliente paga con tarjeta.","criteria":["El pedido queda pagado al aprobarse la tarjeta"]},{"title":"Modelo de pagos","route":"CHANGE","parent":1,"problem":"No hay dónde guardar un pago.","outcome":"Cada pedido tiene sus pagos con estado.","criteria":["Un pago empieza pendiente"]},{"title":"Checkout con Stripe","route":"CHANGE","parent":1,"blockedBy":[2],"problem":"El checkout no cobra con tarjeta.","outcome":"El checkout cobra con Stripe.","criteria":["El checkout crea un pago y lo confirma con Stripe"]}]'
