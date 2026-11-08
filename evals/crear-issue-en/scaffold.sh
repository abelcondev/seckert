#!/bin/sh
# Repo de prueba conectado a un GitHub falso, sin issues.
set -e
here=$(cd "$(dirname "$0")" && pwd)
"$here/../_fixture/setup.sh"
"$here/../_fixture/gh-repo.sh"
