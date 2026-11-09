#!/bin/sh
set -e
here=$(cd "$(dirname "$0")" && pwd)
"$here/../_fixture/setup.sh" "$here/overlay"
"$here/../_fixture/gh-repo.sh"
