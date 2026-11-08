---
name: workflow
description: seckert rules: when a request needs a proposal, branches and test level. Use it when a request may be large or sensitive (schema, new money or permissions logic, AI, several parts), or to create or tidy AGENTS.md ("armá el AGENTS.md", "ordená el CLAUDE.md").
---

# seckert: lightweight workflow

Small changes go straight through; only what deserves it gets paperwork, and that paperwork is **a single file** in `sdd/changes/`. The project's rules (`CLAUDE.md` or `AGENTS.md`) override this skill. Talk to the user in their language.

- `sdd/specs/<area>.md`: how the system behaves **today**, one rule per `## `, no history. Write rules with `spec_write`.
- `sdd/changes/<date>-<slug>.md`: proposal, tasks and log of a large change. Read and write it with the seckert MCP tools: `change_get`, `change_create`, `change_update` (What, questions, tasks, Log, diagram, hashes after a rebase), `change_transition`, `task_complete` and `verify_record`. If a tool can't do something, edit the file directly; only the status and `- [x]` always go through `change_transition` and `task_complete`.
- Issues on GitHub (repo of `origin`): what a client asked for, before it becomes work. Read and write them with `issue_create` (always draft), `issue_get`, `issue_list` and `issue_transition` (approve with the user's exact words, or discard); never edit their `seckert:*` labels by hand. Rules in `sdd/specs/issues.md`.
- Design lives in the Claude artifact; the change only links it in `design:`.

## Issues mode

With the line `seckert issues: github` in `AGENTS.md` or `CLAUDE.md`, GitHub issues replace `sdd/changes/` as the place where work lives. The contract is `docs/contrato-issue.md`.

- **Every work request becomes an issue**, without the user saying "create an issue": "vamos a agregar un botón para descargar un CSV" → `issue_create`, in the request's language, with its type. Questions, explanations and explorations don't.
- **Only decided things go in.** What isn't clear stays in the session; when the discussion reaches something concrete, offer in one line to turn it into an issue, with what was decided in Decisions. Small pending doubts go to Open questions and block approval until answered with `issue_answer`.
- **A request from the user with no open questions** is approved with their words (`issue_transition`) and taken (`seckert:tomar`). With "para después" or "anotalo", only create it.
- **The route still applies.** A FIX or SPEC is done directly on the linked branch and ends in a PR with `Fixes #n`. A CHANGE lives in its issue: `change_create` with `issue` and without `why`/`what` attaches the `Plan` artifact, and waits for the "dale". The other change tools work the same way.
- The design goes in `issue_create` as `design`: it becomes the `Design` link artifact.
- To create or tidy `AGENTS.md`, follow [agents-template.md](agents-template.md) with what you find in the repo and show it before writing it.

Explaining, researching or reviewing is read-only: don't write files or create changes.

## Pick the route

| Route | When | What to do |
|---|---|---|
| **FIX** | No rule changes: bug, copy, style, a screen from an artifact without new logic | Code it directly, as without seckert |
| **SPEC** | The value of an existing rule changes (a threshold, a price, a limit), even for money or permissions | Code it and update the rule with `spec_write` in the same change |
| **CHANGE** | Schema or stored data, new money, auth or permissions logic, AI pipeline, large work or unclear approach | Proposal with the `seckert:change` skill; **wait for the "yes"** before touching code |

- When unsure between FIX and CHANGE, FIX; if a FIX or SPEC grows past ~8 code files, stop and propose a CHANGE.
- A new screen is a CHANGE only if it brings data, permissions or new logic.
- The user says "no proposal" → FIX. Commit, push, PR or release notes are not classified.
- Only mention the route when it is a CHANGE. For a SPEC, say at the end which rule you updated.

## Life of a CHANGE

`proposed` ──(user says yes)──► `approved` ──(user closes it)──► `done`. Only the user approves and closes: `change_transition` with their exact words.

- While `proposed`, adjustments go to the same file and doubts to `## Open questions`, numbered.
- When the tasks are done: new or changed rules with `spec_write`, a summary of what changed and what you couldn't verify, and offer to verify it; once they're happy, offer to close it and open the PR, in words, not commands.
- If requirements change: in one `change_update`, edit only the affected What points (`what_edit`) and reopen only their tasks (`task_reopen`, with why).

## Branches and commits

The branch flow arrives in the session-start context; don't ask which one the project uses. The base is `develop` (or `dev`) if it exists; otherwise `main`.

- **FIX / SPEC**: don't switch branches to edit. If the user asks to commit and you're on a protected branch, create `fix/<slug>` from the base.
- **CHANGE**: `change_transition` creates `feature/<slug>` on approval.
- If there are uncommitted changes that aren't yours, ask before switching branches.
- Commits in the project's format (Conventional Commits by default), one per task.

## Tests by risk

The project sets the level with `seckert tests: light | risk | strict` in its `CLAUDE.md` or `AGENTS.md`; default `risk`.

| Task type | `light` | `risk` (default) | `strict` |
|---|---|---|---|
| **Bug** | test that reproduces it, first | test that reproduces it, first | test first |
| **Sensitive logic** (money, permissions, data migration or transformation) | test in the same change | **test first** | test first |
| **Other logic** | optional | test in the same change | test first |
| **Presentation** | no test | no test, checked against the artifact | no test, checked against the artifact |

- "Test first": write it, run it and **see it fail** before implementing.
- Logic trapped in a component: extract it to a module and test that. A test that reads source code as text doesn't cover behavior.
- In the change's `## Testing`, what was tested or why it doesn't apply.
- Reuse helpers, components and tokens; don't duplicate. With a design artifact, follow `seckert:design`.

## Writing

Proposals, verification reports, PR bodies, release notes and chat replies use controlled language (a light ASD-STE100), in the user's language:

- Short sentences: about 20 words at most, a guide, not a hard limit. One idea per sentence.
- Active voice, with who does it: "the hook blocks the push", not "the push is blocked".
- One term per thing: once you call it "cupón", don't switch to "descuento" or "código".
- Concrete words: the file, the value, the command. No filler, no hedging, no restating the request.
- Lists for steps and options; prose only for the why.

## Wrap up and delegate

Report what was verified (with evidence), what failed or is pending, and the next step. Never claim something works without having observed it. When delegating, pass the change path and task IDs; to verify, the `seckert-verifier` agent.
