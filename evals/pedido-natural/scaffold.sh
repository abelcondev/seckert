#!/bin/sh
# Sin issues todavía.
set -e
here=$(cd "$(dirname "$0")" && pwd)
"$here/../_fixture/setup.sh"
"$here/../_fixture/gh-repo.sh"
