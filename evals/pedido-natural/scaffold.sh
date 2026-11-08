#!/bin/sh
# Modo issues, sin issues todavía.
set -e
here=$(cd "$(dirname "$0")" && pwd)
"$here/../_fixture/setup.sh"
"$here/../_fixture/issues-mode.sh"
"$here/../_fixture/gh-repo.sh"
