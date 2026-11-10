---
name: workflow
description: seckert rules: when a request needs a proposal, branches and test level. Use it when a request may be large or sensitive (schema, new money or permissions logic, AI, several parts), or to create or tidy AGENTS.md ("armá el AGENTS.md", "ordená el CLAUDE.md").
---

# seckert: lightweight workflow

Work lives in GitHub issues of the `origin` repo; small changes go straight through, and only what deserves it gets a plan, attached to its issue. The project's rules (`CLAUDE.md` or `AGENTS.md`) override this skill. Talk to the user in their language.

- `sdd/specs/<area>.md`: how the system behaves **today**, one rule per `## `, no history. Write rules with `spec_write`.
- Issues on GitHub: every piece of work. Read and write them with `issue_create` (always draft), `issue_get`, `issue_list`, `issue_transition` (approve with the user's exact words, or discard), `issue_answer`, `issue_take`, `issue_link` and `issue_close`; never edit their `seckert:*` labels by hand. The contract is `docs/contrato-issue.md`; the rules, `sdd/specs/issues.md`.
- A CHANGE lives in its issue: Why and What come from the issue (Problem, Outcome, criteria) and the plan is its `Plan` artifact. Read and write it with `change_get`, `change_create`, `change_update` (What, questions, tasks, Log, diagram, hashes after a rebase), `change_transition`, `task_complete` and `verify_record`.
- Design lives in the Claude artifact; the issue links it as its `Design` artifact.
- Without an `origin` on GitHub, seckert can't track work: say so in one line (add a GitHub origin and run `gh auth login`) and go on without issues.

## Issues

- **Every work request becomes an issue**, without the user saying "create an issue": "vamos a agregar un botón para descargar un CSV" → `issue_create`, in the request's language, with its type. Questions, explanations and explorations don't.
- **No duplicates.** Before proposing or creating work, check the open issues (`issue_list`). If one covers it, use it; `issue_create` returns `similar` when it finds look-alikes.
- **Only decided things go in.** What isn't clear stays in the session; when the discussion reaches something concrete, offer in one line to turn it into an issue, with what was decided in Decisions. Small pending doubts go to Open questions and block approval until answered with `issue_answer`.
- **A request from the user with no open questions** is approved with their words (`issue_transition`) and taken (`seckert:tomar`). With "para después" or "anotalo", only create it.
- **The route still applies.** A FIX or SPEC is done directly on the linked branch and ends in a PR with `Fixes #n`. A CHANGE attaches its plan with `change_create` and waits for the "dale".
- The design goes in `issue_create` as `design`: it becomes the `Design` link artifact.
- **Board (optional):** if the repo has a GitHub Projects board linked, creating, approving and taking an issue move its card. `board_plan` sets priority, size and cycle (current, next, none or a title); `issue_create` takes them too. `board_list` answers "¿qué entra en este cycle?" (current cycle by default, ordered by priority). `board_sync` moves cards after a PR or a merge. `board_setup` creates the board, only if the user asks for one.
- To create or tidy `AGENTS.md`, follow [agents-template.md](agents-template.md) with what you find in the repo and show it before writing it.

Explaining, researching or reviewing is read-only: don't write files or create issues or changes.

## Pick the route

| Route | When | What to do |
|---|---|---|
| **FIX** | No rule changes: bug, copy, style, a screen from an artifact without new logic | Code it directly on the issue's branch |
| **SPEC** | The value of an existing rule changes (a threshold, a price, a limit), even for money or permissions | Code it and update the rule with `spec_write` in the same change |
| **CHANGE** | Schema or stored data, new money, auth or permissions logic, AI pipeline, 3 or more steps that merge together, large work or unclear approach | Proposal with the `seckert:change` skill; **wait for the "yes"** before touching code |

- When unsure between FIX and CHANGE, FIX; if a FIX or SPEC grows past ~8 code files, stop and propose a CHANGE.
- If you would list 3 or more steps for the user, it is a CHANGE: the steps become the plan's tasks, so they are tracked in the issue and not only in the chat. Fewer than 3 steps: FIX.
- A new screen is a CHANGE only if it brings data, permissions or new logic.
- The user says "no proposal" → FIX. Commit, push, PR or release notes are not classified.
- Only mention the route when it is a CHANGE. For a SPEC, say at the end which rule you updated.

## Life of a CHANGE

`proposed` ──(user says yes)──► `approved` ──(user closes it)──► `done`. Only the user approves and closes: `change_transition` with their exact words.

- Every reply on a change ends with its roadmap (`seckert:next`): done/total and the tasks, with the next one marked. "Hacé todas" does all the pending tasks in a row.

- While `proposed`, adjustments go to the same plan and doubts to `## Open questions`, numbered.
- When the tasks are done: new or changed rules with `spec_write`, a summary of what changed and what you couldn't verify, and offer to verify it; once they're happy, offer to close it and open the PR, in words, not commands.
- If requirements change: in one `change_update`, edit only the affected What points (`what_edit`) and reopen only their tasks (`task_reopen`, with why).

## Branches and commits

The branch flow arrives in the session-start context; don't ask which one the project uses. The base is `develop` (or `dev`) if it exists; otherwise `main`.

- `issue_take` creates the branch linked to the issue from the base and switches to it: `fix/<slug>` for a FIX or SPEC, `feature/<slug>` for a CHANGE. Approving the change keeps that branch.
- Never commit on a protected branch: if you are on one, take the issue first.
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

Report what was verified (with evidence), what failed or is pending, and the next step. Never claim something works without having observed it. When delegating, pass the change's slug and task IDs; to verify, the `seckert-verifier` agent.
