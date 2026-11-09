---
name: hotfix
description: Fixes a production failure starting from what is in production, with a test that reproduces it. Use it only if the failure is in production ("se rompió en prod", "hotfix"); a bug in development is not a hotfix.
argument-hint: <description of the production failure>
---

Failure: $ARGUMENTS

The branch flow is in the session-start context.

1. Check there are no uncommitted changes that would be lost; if there are, ask what to do.
2. `git fetch` and branch from `origin/main` (what's in production): `hotfix/<slug>` in gitflow, `fix/<slug>` in PRs only.
3. Reproduce it with a failing test (RED). If it isn't testable (visual or infrastructure only), say so and reproduce it another observable way.
4. Fix it with the minimal change; no refactors or features on the side.
5. Full suite green and commit `fix(scope): …`.
6. If the failure contradicts or changes a rule in `sdd/specs/`, update it with `spec_write` in the same commit. A hotfix gets no plan unless it touches schema, money or permissions; then attach a short one to its issue with `change_create` and ask for approval before fixing.
7. Ask whether to open the PR. If yes: push and `gh pr create --base main`. After the merge, remind the back-merge PRs with a merge commit (no squash) if the flow has them: `main → develop` in gitflow, plus `main → staging` with staging. If it applies, a tag once production is stable.
