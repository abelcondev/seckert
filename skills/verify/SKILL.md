---
name: verify
description: Verifies a change in sdd/changes against its ## What and the design artifact. Use it when the user asks to check ("verificá", "¿funciona?", "probalo") or after the last task of a change.
argument-hint: "[slug]"
---

`change_get` with `$ARGUMENTS` (or the only `approved` one): it brings the What, the last verification and how many times each point failed.

1. Delegate functional verification to the `seckert-verifier` agent, passing **only** the change path (`file`). If the last verification had failing points and commits since then touch them, pass those points too, exactly as in the What: it re-verifies only those, plus the full suite.
2. If the change has `design` or What points only visible in the app, check them yourself in the browser following [navegador.md](navegador.md); with `design`, read the artifact and compare. The verifier doesn't see the artifact or use the browser. If Chrome DevTools MCP isn't loaded and the context doesn't say `SECKERT_QA=sin-navegador`, always offer to install it in one line at the end, as navegador.md says, and mark those points `NO VERIFICABLE (sin navegador)`; never just suggest running the app yourself.
3. Show the verdict table to the user, with the visual check as one more row, following the writing rules in `seckert:workflow`. If the verifier named a failure type, say it with the places where it appears.
4. Record it with `verify_record`: one row per point, named exactly as in the What (visual vs design as `Diseño`); for each `FALLA`, the tasks to reopen and one line on what you'd change in the approach (`recomendacion`); `PREEXISTENTE` tests and the commands run. The tool writes the Log, reopens tasks and applies the round limit.
5. From its result: for `tercera_vez`, say the point failed 3 times, wasn't reopened and became an open question (with its number) with your recommendation; for `reabiertas`, name the reopened tasks. A `PREEXISTENTE` test already failed before the change: it reopens nothing and isn't fixed here; say it in one line.

Don't fix anything in this step; offer to. If everything passes, offer to close it and open the PR if they want, without naming commands.
