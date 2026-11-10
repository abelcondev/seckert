#!/bin/sh
# feature #1 con dos partes FIX: #3 está bloqueada por #2.
set -e
here=$(cd "$(dirname "$0")" && pwd)
"$here/../_fixture/setup.sh"
"$here/../_fixture/gh-repo.sh"
node "$here/../_fixture/issues.mjs" '[{"title":"Checkout más claro","route":"CHANGE","labels":["seckert:approved","type:feature"],"problem":"Los clientes no entienden el checkout.","outcome":"El checkout dice qué hace cada paso.","criteria":["El botón dice Confirmar pedido","El checkout avisa cuánto falta para el envío gratis"]},{"title":"El botón del checkout dice Confirmar pedido","route":"FIX","parent":1,"problem":"El botón dice Enviar y los clientes creen que envía un mensaje.","outcome":"El botón dice Confirmar pedido.","criteria":["El botón del checkout dice Confirmar pedido"]},{"title":"Aviso de cuánto falta para el envío gratis","route":"FIX","parent":1,"blockedBy":[2],"problem":"El cliente no sabe cuánto le falta para no pagar envío.","outcome":"El checkout muestra cuánto falta para los $50.","criteria":["Con subtotal menor a 50, el checkout muestra cuánto falta"]}]'
