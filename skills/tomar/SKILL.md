---
name: tomar
description: Takes an approved GitHub issue of seckert and works it through its route (FIX, SPEC or CHANGE) on a branch linked to the issue. Use it when the user names an issue to work on ("tomá el 12", "agarrá el issue #12", "seguí con el #12") or asks which issues are ready ("¿qué issues hay aprobados?").
argument-hint: "[issue number]"
---

Issue: $ARGUMENTS

1. No number: `issue_list` with `approved` and with `in-progress`. Show them numbered (number, title, route) and ask which one. None: say so in one line.
2. `issue_take` with the number. It creates the branch linked to the issue from the base and switches to it, or resumes the one it already has. If it fails:
   - Draft: say it isn't approved and ask. Approve it only with the user's words (`issue_transition`, `aprobacion` = their exact words), then retry.
   - Uncommitted changes: say which files and ask whether to commit or stash them. Never discard them.
   - In review, closed or discarded: say so and stop.
3. Show the issue in a few lines: title, the client's quote, the acceptance criteria and the route. The route is a suggestion: if the work is clearly bigger or smaller, say so in one line and ask.
4. Follow the route on the linked branch, with the `seckert:workflow` rules:
   - **FIX**: do it directly. A logic bug gets a failing test first. Check each acceptance criterion and commit (`fix(scope): …`).
   - **SPEC**: change the rule with `spec_write` and the code that follows it, in the same commit.
   - **CHANGE**: `change_create` with `slug` = the branch name without `feature/` and `issue` = the number. The `what` comes from the acceptance criteria, quoting the client; `pedido` is the issue's title and quote, verbatim. Then wait for the user's "dale", as with any proposal: approving it keeps the same branch.
   - A FIX that turns into a CHANGE stays on the linked `fix/` branch: create the change and set its `branch:` to that branch.
5. When the work is done, offer the next step in words: "¿lo verifico?" for a CHANGE, or "si está bien, abro el PR" for a FIX or SPEC.
6. The PR, only when the user asks:
   - A CHANGE closes with `seckert:done` as usual; its PR already carries `Fixes #n`.
   - A FIX or SPEC: full suite green, then `pr_draft` with `issue` = the number. Fill in `How to revert` as `seckert:done` says, then `git push -u origin <branch>` and `gh pr create --base <base> --title <title> --body-file <body>`.
   - The body starts with `Fixes #n`: GitHub shows the issue in review and the merge closes it. Never move those states by hand.
