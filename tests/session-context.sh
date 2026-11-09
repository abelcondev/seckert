#!/bin/sh
# Tests de scripts/session-context.sh. Correr: sh tests/session-context.sh
# El contexto de inicio: las reglas de seckert, con GitHub issues como flujo de trabajo.
script="$(cd "$(dirname "$0")/.." && pwd)/scripts/session-context.sh"
fails=0

check() { # nombre esperado obtenido
  if [ "$2" = "$3" ]; then echo "(pass) $1"; else echo "(fail) $1"; echo "  esperado: '$2'"; echo "  obtenido: '$3'"; fails=$((fails + 1)); fi
}

has() { # texto -> 1 si el contexto lo contiene
  sh "$script" 2>/dev/null | grep -Fq "$1" && echo 1 || echo 0
}

t=$(mktemp -d)
cd "$t" && git init -q -b main && git -c user.name=t -c user.email=t@t commit -q --allow-empty -m init

check "sin origin avisa que seckert necesita GitHub" 1 "$(has 'needs a GitHub repo')"
check "sin origin no da las reglas de issues" 0 "$(has 'look at the open issues')"
git remote add origin git@gitlab.com:acme/app.git
check "con origin fuera de GitHub también avisa" 1 "$(has 'needs a GitHub repo')"
git remote set-url origin git@github.com:acme/app.git
check "con origin en GitHub no avisa" 0 "$(has 'needs a GitHub repo')"
check "los issues de GitHub son el flujo de trabajo" 1 "$(has 'GitHub issues are the work tracker')"
check "un pedido de trabajo va a un issue sin pedirlo" 1 "$(has 'without the user saying')"
check "lo que no está claro se discute en la sesión" 1 "$(has 'stays in the session')"
check "antes de crear, revisa los issues abiertos" 1 "$(has 'look at the open issues')"
check "el plan del change va a su issue con change_update" 1 "$(has 'plan in its issue with change_update')"
check "no manda a escribir sdd/changes" 0 "$(has 'sdd/changes')"
check "no lista changes abiertos" 0 "$(has 'Open changes')"
check "no corre el servidor MCP" 0 "$(grep -c 'server.mjs' "$script")"
check "no depende de una línea en AGENTS.md" 0 "$(has 'seckert issues:')"

rm -rf "$t"
[ "$fails" -eq 0 ] && echo " 0 fail" || { echo " $fails fail"; exit 1; }
