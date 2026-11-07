---
name: release
description: Prepares a release with version and notes following the repo's branch flow. Use it only when the user asks for it ("sacá la release", "cortá la 1.4.0").
argument-hint: <x.y.z>
---

Version: $ARGUMENTS

1. `release_draft` (with the version if given): proposed version, branch, where it starts from, version files, draft notes and the `done` changes. Without a given version, propose it and ask for confirmation.
2. Clean tree and `git fetch`; create the branch from `origin/<from>`.
3. Bump the version in `version_files` (the project's `CLAUDE.md` or `AGENTS.md` may name others). Don't invent version files.
4. Rewrite the notes in user language, following the writing rules in `seckert:workflow`: Features / Fixes, one line per change.
5. Full suite green, plus typecheck/build if the project defines them. Commit `chore(release): x.y.z`.
6. Ask whether to open the PR. If yes: push and `gh pr create` with the notes as body, to `main` (PRs only and gitflow) or to the staging branch (gitflow with staging).
7. Remind the remaining steps without doing them:
   - **PRs only**: merge to `main`, production migrations if any (dry-run first) and the GitHub release.
   - **gitflow**: merge to `main` with a merge commit (no squash), production migrations (dry-run first), PR `main → develop`, and the GitHub release once production is stable.
   - **gitflow with staging**: merge to staging and QA (staging migrations if any); once approved, PR `staging → main` with a merge commit, production migrations (dry-run first), PR `main → develop` and the GitHub release once production is stable.

The GitHub release is created after the merge with `gh release create vx.y.z --target main --title "vx.y.z" --notes-file <notes>`: it tags the merge on `main` and publishes the notes, no `git push`. If the project already has another way (a workflow that releases on merge), use that.

Fixes during stabilization go on the `release/*` branch as `fix(scope): …`.
