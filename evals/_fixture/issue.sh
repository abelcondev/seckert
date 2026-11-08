#!/bin/sh
# Prepara el repo de prueba para issues: origin de GitHub (el push va a un remoto local)
# y un issue aprobado en .gh.json. Uso: issue.sh <título> <ruta> <contexto> <cita> <criterio>
set -e
git remote add origin git@github.com:eval/tienda.git
git init -q --bare .remote.git
git config remote.origin.pushurl "$PWD/.remote.git"
printf '.remote.git\n.gh.json\n' >> .git/info/exclude
git push -q origin main
TITLE="$1" ROUTE="$2" CONTEXT="$3" QUOTE="$4" CRITERION="$5" node -e '
const e = process.env
const body = ["<!-- seckert:issue v1 -->", "", "## Context", "", e.CONTEXT, "", "> " + e.QUOTE, "", "## Acceptance criteria", "", "- [ ] " + e.CRITERION, "", "## Route", "", e.ROUTE, "", "## Origin", "", "- Meeting: Reunión semanal con Acme", "- Date: 2026-11-06", "- Client: Acme", ""].join("\n")
const issue = { number: 1, title: e.TITLE, body, state: "OPEN", labels: ["seckert:approved"], comments: ["Aprobado por el usuario: «dale»"] }
require("fs").writeFileSync(".gh.json", JSON.stringify({ issues: [issue], calls: [] }, null, 2))
'
