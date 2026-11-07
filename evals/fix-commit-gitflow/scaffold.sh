#!/bin/sh
set -e
here=$(cd "$(dirname "$0")" && pwd)
"$here/../_fixture/setup.sh"
git branch develop && git switch -q develop
