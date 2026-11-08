#!/bin/sh
# Tests de scripts/guard-branch.sh. Correr: sh tests/guard-branch.sh
# Cada caso le pasa al hook la entrada de un Bash, como en PreToolUse, dentro de un repo
# temporal con main (solo PRs), y mira si lo deja pasar (0) o lo bloquea (2).
script="$(cd "$(dirname "$0")/.." && pwd)/scripts/guard-branch.sh"
fails=0

check() { # nombre esperado obtenido
  if [ "$2" = "$3" ]; then echo "(pass) $1"; else echo "(fail) $1"; echo "  esperado: '$2'"; echo "  obtenido: '$3'"; fails=$((fails + 1)); fi
}

hook() { # comando -> código de salida del hook
  printf '{"tool_name":"Bash","tool_input":{"command":"%s"}}' "$1" | sh "$script" 2>/dev/null
  echo $?
}

t=$(mktemp -d)
cd "$t" && git init -q -b main && git -c user.name=t -c user.email=t@t commit -q --allow-empty -m init && git tag v1.0.0

# En main
check "commit en main se bloquea" 2 "$(hook 'git commit -m x')"
check "push en main se bloquea" 2 "$(hook 'git push')"
check "push origin main en main se bloquea" 2 "$(hook 'git push origin main')"
check "push de un tag en main pasa" 0 "$(hook 'git push origin v1.0.0')"
check "push de refs/tags en main pasa" 0 "$(hook 'git push origin refs/tags/v1.0.0')"
check "push origin tag <x> en main pasa" 0 "$(hook 'git push origin tag v1.0.0')"
check "push --tags en main pasa" 0 "$(hook 'git push --tags')"
check "push -q origin --tags en main pasa" 0 "$(hook 'git push -q origin --tags')"
check "tag nuevo y push del tag en el mismo comando pasa" 0 "$(hook 'git tag v1.0.1 && git push -q origin v1.0.1')"
check "push de main y un tag juntos se bloquea" 2 "$(hook 'git push origin main v1.0.0')"
check "push --follow-tags en main se bloquea" 2 "$(hook 'git push --follow-tags')"
check "checkout -q -b y commit en el mismo comando pasa" 0 "$(hook 'git checkout -q -b fix/y && git commit -m x')"
check "el mensaje no dice Gitflow en solo PRs" "" "$(printf '{"tool_input":{"command":"git push"}}' | sh "$script" 2>&1 | grep -o Gitflow)"

# Flags juntos al crear la rama
check "switch -qc y commit en el mismo comando pasa" 0 "$(hook 'git switch -qc fix/y && git commit -m x')"
check "checkout -qb y commit en el mismo comando pasa" 0 "$(hook 'git checkout -qb fix/y && git commit -m x')"

# Otro repo: manda la rama de ese repo, no la del de la sesión (que está en main)
otro=$(mktemp -d) && git -C "$otro" init -q -b main && git -C "$otro" -c user.name=t -c user.email=t@t commit -q --allow-empty -m init && git -C "$otro" checkout -q -b fix/z
otro_main=$(mktemp -d) && git -C "$otro_main" init -q -b main && git -C "$otro_main" -c user.name=t -c user.email=t@t commit -q --allow-empty -m init
check "cd a otro repo en una rama de trabajo y commit pasa" 0 "$(hook "cd $otro && git commit -m x")"
check "git -C otro repo en una rama de trabajo, commit pasa" 0 "$(hook "git -C $otro commit -m x")"
check "cd a otro repo y push de su rama pasa" 0 "$(hook "cd $otro && git push -u origin fix/z")"
check "cd a otro repo en main y commit se bloquea" 2 "$(hook "cd $otro_main && git commit -m x")"
check "git -C otro repo en main, commit se bloquea" 2 "$(hook "git -C $otro_main commit -m x")"
rm -rf "$otro" "$otro_main"

# En una rama de trabajo
git checkout -q -b fix/x
check "push de la rama de trabajo pasa" 0 "$(hook 'git push -u origin fix/x')"
check "push a main desde otra rama se bloquea" 2 "$(hook 'git push origin HEAD:main')"
check "commit en la rama de trabajo pasa" 0 "$(hook 'git commit -m x')"

cd / && rm -rf "$t"
[ "$fails" -eq 0 ] && echo " 0 fail" || { echo " $fails fail"; exit 1; }
