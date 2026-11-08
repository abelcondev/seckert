---
name: tomar
description: Takes an approved GitHub issue of seckert and works it through its route (FIX, SPEC or CHANGE) on a branch linked to the issue. Use it when the user names an issue to work on ("tomá el 12", "agarrá el issue #12", "seguí con el #12") or asks which issues are ready ("¿qué issues hay aprobados?").
argument-hint: "[issue number]"
---

Issue: $ARGUMENTS

1. No number: `issue_list` with `approved` and with `in-progress`. Show them numbered (number, title, route) and ask which one. None: say so in one line.
2. **A feature split into parts.** First `issue_get`. If the issue is `type:feature`:
   - **It already has sub-issues:** `issue_take` returns `parts` (with what blocks each) and `next`, without creating a branch. Show the parts in a few lines and offer to take `next`; with "dale", take it as in step 3.
   - **No sub-issues, and it bundles parts that each work and merge on their own** (a data model, a flow on top, a screen): propose the split in one message, one line per part with title, route and what blocks it. Don't create anything yet.
   - **On the user's "dale":** create each part with `issue_create` in order: `parent` = the feature, `blockedBy` = the parts that must merge first, `kind`, and `design` if it touches screens and the feature has one. Approve each with `issue_transition` and the user's words. Then offer to take the first.
   - **One part is enough:** take the feature itself as in step 3.
   - A CHANGE's internal tasks (T1, T2…) stay in its plan; they are never sub-issues.
3. `issue_take` with the number. It creates the branch linked to the issue from the base and switches to it, or resumes the one it already has. If it fails:
   - Draft: say it isn't approved and ask. With open questions, ask them by number first; record each answer with `issue_answer` (it moves to Decisions). Approve only with no open questions and the user's words (`issue_transition`, `aprobacion` = their exact words), then retry.
   - Uncommitted changes: say which files and ask whether to commit or stash them. Never discard them.
   - In review, closed or discarded: say so and stop.
4. Show the issue in a few lines: title, the client's quote, the acceptance criteria and the route. The route is a suggestion: if the work is clearly bigger or smaller, say so in one line and ask.
5. Follow the route on the linked branch, with the `seckert:workflow` rules:
   - **FIX**: do it directly. A logic bug gets a failing test first. Check each acceptance criterion and commit (`fix(scope): …`).
   - **SPEC**: change the rule with `spec_write` and the code that follows it, in the same commit.
   - **CHANGE**: `change_create` with `slug` = the branch name without `feature/` and `issue` = the number; `pedido` is the issue's title and quote, verbatim.
     - With `seckert issues: github` in AGENTS.md, the change lives in the issue: omit `why` and `what` (they come from Problem, Outcome and the criteria) and write only the plan: tasks, specs, diagram, testing. It is attached as the `Plan` artifact.
     - Without it, the change is a file: `what` comes from the acceptance criteria, quoting the client.
     - If the issue has a design (`design` in the `issue_take` result), say so and plan the presentation tasks against it; they are translated with `seckert:design` when implemented. If you can't open the design now, still write the plan and say in one line that the design is read when those tasks start.
     - Then wait for the user's "dale", as with any proposal: approving it keeps the same branch.
   - A FIX that turns into a CHANGE stays on the linked `fix/` branch: create the change and set its `branch:` to that branch.
6. When the work is done, offer the next step in words: "¿lo verifico?" for a CHANGE, or "si está bien, abro el PR" for a FIX or SPEC.
7. The PR, only when the user asks:
   - A CHANGE closes with `seckert:done` as usual; its PR already carries `Fixes #n`.
   - A FIX or SPEC: full suite green, then `pr_draft` with `issue` = the number. Fill in `How to revert` as `seckert:done` says, then `git push -u origin <branch>` and `gh pr create --base <base> --title <title> --body-file <body>`.
   - The body starts with `Fixes #n`: GitHub shows the issue in review and the merge closes it. Never move those states by hand.
