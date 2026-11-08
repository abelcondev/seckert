#!/bin/sh
# Bloquea git commit / git push directos sobre las ramas de larga vida del
# repo (main, develop, staging: las que existan), detectadas por detect-flow.sh.
# Un push que solo sube tags pasa: el tag de una release se pone estando en main.

input=$(cat)
case "$input" in
  *"git "*) ;;
  *) exit 0 ;;
esac

# Crear una rama en el mismo comando (checkout -b / switch -c, también con flags juntos
# como -qb o -qc) es el camino correcto.
if printf '%s' "$input" | grep -Eq 'git (checkout( -[a-zA-Z-]+)* -[a-zA-Z]*b|switch( -[a-zA-Z-]+)* (-[a-zA-Z]*c|--create)) '; then
  exit 0
fi

# El repo que importa es el del comando: `cd <dir> && git …` o `git -C <dir> …`, si no el de la sesión.
target=$(printf '%s' "$input" | grep -Eo '(^|[^a-zA-Z])cd [^ ;&|"]+|git -C [^ ;&|"]+' | head -1 | sed -E 's/^.*(cd|-C) //')
if [ -n "$target" ]; then
  target=$(printf '%s' "$target" | sed -E "s/^['\\]+//; s/['\\]+$//")
  case "$target" in "~"*) target="$HOME${target#\~}" ;; esac
  cd "$target" 2>/dev/null || exit 0
fi

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null) || exit 0
. "$(dirname "$0")/detect-flow.sh"
protected=$SECKERT_PROTECTED

# ¿Es un tag? refs/tags/…, uno que ya existe o uno que el mismo comando crea con git tag.
is_tag() {
  case "$1" in refs/tags/*) return 0 ;; esac
  git show-ref --verify --quiet "refs/tags/$1" && return 0
  printf '%s' "$input" | grep -Eq "git tag[^;&|]* $1([ ;&|\\\"]|\$)"
}

# ¿El push (un segmento "git push …") sube solo tags?
push_only_tags() {
  set -f
  set -- $1
  set +f
  shift # git
  [ "$1" = "-C" ] && shift 2
  shift # push
  remote= tags=0 refs=0 next_tag=0
  for tok in "$@"; do
    case "$tok" in
      --tags) tags=1 ;;
      -*) ;;
      *)
        if [ "$next_tag" = 1 ]; then next_tag=0; refs=$((refs + 1))
        elif [ -z "$remote" ]; then remote=$tok
        elif [ "$tok" = tag ]; then next_tag=1
        elif is_tag "$tok"; then refs=$((refs + 1))
        else return 1
        fi ;;
    esac
  done
  [ "$tags" = 1 ] || [ "$refs" -gt 0 ]
}

pushes=$(printf '%s' "$input" | grep -Eo 'git (-C [^ ]+ )?push[^;&|"]*')

for p in $protected; do
  if printf '%s' "$input" | grep -Eq 'git (-C [^ ]+ )?commit' && [ "$branch" = "$p" ]; then
    echo "seckert: no se commitea directo en '$p'. Crea una rama de trabajo (feature/<slug> o fix/<slug>) y commitea ahí." >&2
    exit 2
  fi
  if [ -n "$pushes" ]; then
    if printf '%s' "$input" | grep -Eq "git (-C [^ ]+ )?push[^;&|]* (HEAD:)?$p([ ;&|\"]|\$)"; then
      blocked=1
    elif [ "$branch" = "$p" ]; then
      blocked=$(printf '%s\n' "$pushes" | while IFS= read -r seg; do push_only_tags "$seg" || { echo 1; break; }; done)
    else
      blocked=
    fi
    if [ -n "$blocked" ]; then
      echo "seckert: no se hace push directo a '$p'. Sube tu rama y abre un PR hacia ella. Los tags sí se suben: git push origin vX.Y.Z." >&2
      exit 2
    fi
  fi
done
exit 0
