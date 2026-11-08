#!/bin/sh
# Repo de prueba con un issue v2 aprobado en .gh.json.
# Uso: [DESIGN=<url>] [NO_ARTIFACTS=1] issue.sh <título> <ruta> <problema> <cita> <criterio> <resultado esperado>
set -e
here=$(cd "$(dirname "$0")" && pwd)
"$here/gh-repo.sh"
TITLE="$1" ROUTE="$2" PROBLEM="$3" QUOTE="$4" CRITERION="$5" OUTCOME="$6" node -e '
const e = process.env
const body = ["<!-- seckert:issue v2 -->", "", "## Problem", "", e.PROBLEM, "", "> " + e.QUOTE, "", "## Outcome", "", e.OUTCOME, "", "## Acceptance criteria", "", "- [ ] " + e.CRITERION, "", "## Route", "", e.ROUTE, "", "## Origin", "", "- Source: Reunión semanal con Acme", "- Date: 2026-11-06", "- Client: Acme", ""].join("\n")
const issue = { number: 1, title: e.TITLE, body, state: "OPEN", labels: ["seckert:approved"], comments: ["Aprobado por el usuario: «dale»"] }
// DESIGN: link artifact «Design». NO_ARTIFACTS: la API de artifacts no existe para el repo.
if (e.DESIGN) issue.artifacts = [{ number: 1, type: "link", name: "Design", body: e.DESIGN, versions: [e.DESIGN] }]
require("fs").writeFileSync(".gh.json", JSON.stringify({ issues: [issue], calls: [], ...(e.NO_ARTIFACTS ? { artifactsUnavailable: true } : {}) }, null, 2))
'
