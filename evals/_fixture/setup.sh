#!/bin/sh
# Arma el repo de prueba en el directorio actual: copia la tienda y hace el commit inicial en main.
# Uso: setup.sh [overlay]  (overlay = carpeta cuyos archivos se copian encima, p.ej. un change en proposed)
set -e
here=$(cd "$(dirname "$0")" && pwd)
cp -R "$here/tienda/." .
[ -n "$1" ] && cp -R "$1/." .
git init -q -b main
git add -A
git -c user.name=eval -c user.email=eval@seckert commit -qm "chore: tienda inicial"
