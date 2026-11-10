#!/bin/sh
# La tienda sin issues: el pedido tiene 3 pasos sin lógica sensible.
set -e
here=$(cd "$(dirname "$0")" && pwd)
"$here/../_fixture/setup.sh"
"$here/../_fixture/gh-repo.sh"
