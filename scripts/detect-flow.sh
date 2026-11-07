#!/bin/sh
# Detecta el flujo de ramas del repo mirando las ramas que existen (locales y
# de origin, sin red). Se carga con `. detect-flow.sh` y deja definidas:
#   SECKERT_MAIN         rama de producción (main o master)
#   SECKERT_DEVELOP      rama de integración si hay gitflow, vacío si no
#   SECKERT_STAGING      rama de staging si existe, vacío si no
#   SECKERT_FLOW         gitflow-staging | gitflow | prs
#   SECKERT_PROTECTED    ramas en las que no se commitea ni se hace push directo
# SECKERT_STAGING_BRANCH y SECKERT_PROTECTED_BRANCHES, si están definidas, mandan.

seckert_has_branch() {
  git show-ref --verify --quiet "refs/heads/$1" || git show-ref --verify --quiet "refs/remotes/origin/$1"
}

seckert_first_branch() {
  for candidate in "$@"; do
    if seckert_has_branch "$candidate"; then
      echo "$candidate"
      return
    fi
  done
}

SECKERT_MAIN=$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||')
[ -n "$SECKERT_MAIN" ] || SECKERT_MAIN=$(seckert_first_branch main master)
[ -n "$SECKERT_MAIN" ] || SECKERT_MAIN=main

SECKERT_DEVELOP=$(seckert_first_branch develop dev development)
SECKERT_STAGING=${SECKERT_STAGING_BRANCH:-$(seckert_first_branch staging stage preprod)}

if [ -n "$SECKERT_DEVELOP" ] && [ -n "$SECKERT_STAGING" ]; then
  SECKERT_FLOW=gitflow-staging
elif [ -n "$SECKERT_DEVELOP" ]; then
  SECKERT_FLOW=gitflow
else
  SECKERT_FLOW=prs
fi

SECKERT_PROTECTED=$(echo ${SECKERT_PROTECTED_BRANCHES:-$SECKERT_MAIN $SECKERT_DEVELOP $SECKERT_STAGING})
