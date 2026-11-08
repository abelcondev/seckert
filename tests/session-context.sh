#!/bin/sh
# Tests de scripts/session-context.sh. Correr: sh tests/session-context.sh
# Con `seckert issues: github` en AGENTS.md, el contexto de inicio suma las reglas del modo issues.
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

check "sin la línea no hay modo issues" 0 "$(has 'Issues mode')"
printf '# app\n\n- seckert issues: github\n' > AGENTS.md
check "con la línea en AGENTS.md aparece el modo issues" 1 "$(has 'Issues mode')"
check "un pedido de trabajo va a un issue sin pedirlo" 1 "$(has 'without the user saying')"
check "lo que no está claro se discute en la sesión" 1 "$(has 'stays in the session')"
rm AGENTS.md
printf '# app\n\nseckert issues: github\n' > CLAUDE.md
check "también en CLAUDE.md" 1 "$(has 'Issues mode')"

rm -rf "$t"
[ "$fails" -eq 0 ] && echo " 0 fail" || { echo " $fails fail"; exit 1; }
