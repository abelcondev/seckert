#!/bin/sh
# Repo de prueba para issues: origin de GitHub (el push va a un remoto local) y un .gh.json vacío para el gh falso.
set -e
git remote add origin git@github.com:eval/tienda.git
git init -q --bare .remote.git
git config remote.origin.pushurl "$PWD/.remote.git"
printf '.remote.git\n.gh.json\n' >> .git/info/exclude
git push -q origin main
printf '{"issues": [], "calls": []}\n' > .gh.json
