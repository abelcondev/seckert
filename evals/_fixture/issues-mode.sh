#!/bin/sh
# Activa el modo issues en el repo de prueba: la línea en AGENTS.md, commiteada.
set -e
printf '\n- seckert issues: github\n' >> AGENTS.md
git add AGENTS.md
git -c user.name=eval -c user.email=eval@seckert commit -qm "chore: modo issues"
