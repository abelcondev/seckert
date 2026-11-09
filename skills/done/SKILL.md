---
name: done
description: Closes a change and optionally opens the PR. Use it only when the user approves it ("cerralo", "está ok", "listo") or asks for the PR ("abrí el PR", "subilo").
argument-hint: "[slug] [pr]"
---

Arguments: $ARGUMENTS

`change_get` with the slug (or the only `approved` one).

1. If tasks are pending, list them and ask whether to close anyway.
2. Check that the rules the change added or changed are in `sdd/specs/<area>.md` (current behavior, no history). Write them with `spec_write` if missing.
3. `change_transition` to `done` with `aprobacion` = the user's exact words (`pendientes: true` if they said to close with pending tasks). Commit the specs on the change's branch; the plan is already in the issue.
4. If the arguments include `pr`, or the user asks:
   - Full suite green.
   - `pr_draft`: base, title and body (Why, What, Testing, Risk, Evidence). Review the title, write the body following the writing rules in `seckert:workflow` and replace the `How to revert` placeholder: short, no commands. Code only: "Revertir el merge". With a migration (`has_migration`): whether the previous code still works with the new schema and what data would be lost undoing it; undoing it is a separate migration decided by the team. With a flag: which one to turn off. Never SQL or destructive commands.
   - The body starts with `Fixes #n`: leave it, it links the PR to the issue and the merge closes it. After `gh pr create`, `board_sync` with that number moves the card on the repo board, if there is one.
   - `git push -u origin <branch>` and `gh pr create --base <base> --title <title> --body-file <body>`. Section titles stay in English; content in the change's language.
   - Hotfix in gitflow: remind the back-merge PRs `main → develop` (and `main → staging` if any), with a merge commit.
5. Reply in one line: change closed, specs updated and the PR URL if opened.
