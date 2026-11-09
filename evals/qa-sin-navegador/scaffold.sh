#!/bin/sh
# Change de presentación terminado: el botón del checkout ya dice "Confirmar pedido". No hay Chrome DevTools MCP. En qa-sin-navegador, el usuario tiene SECKERT_QA=sin-navegador en settings.local.json.
set -e
here=$(cd "$(dirname "$0")" && pwd)
"$here/../_fixture/setup.sh"
"$here/../_fixture/gh-repo.sh"
bun "$here/../_fixture/changes.ts" "$here/changes"
# La preferencia del usuario va en un archivo que git ignora (y un .gitignore global también): se escribe acá, no en el repo del caso.
mkdir -p .claude && printf '{ "env": { "SECKERT_QA": "sin-navegador" } }\n' > .claude/settings.local.json
echo .claude/settings.local.json >> .git/info/exclude
git switch -qc feature/boton-confirmar
sed -i.bak 's/>Enviar</>Confirmar pedido</' src/Checkout.tsx && rm src/Checkout.tsx.bak
git add -A
git -c user.name=eval -c user.email=eval@seckert commit -qm "feat(checkout): el botón dice Confirmar pedido"
