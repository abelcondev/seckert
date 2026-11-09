#!/bin/sh
set -e
here=$(cd "$(dirname "$0")" && pwd)
"$here/../_fixture/setup.sh"
"$here/../_fixture/gh-repo.sh"
git branch develop && git switch -q develop
