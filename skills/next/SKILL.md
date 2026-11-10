---
name: next
description: Implements the next task of a change (it lives in its GitHub issue). Use it when the user approves a proposal ("sí", "dale", "ok, adelante", "aprobado") or asks to continue ("seguí", "siguiente", "continuá", "hacé la T3") or to do them all ("hacé todas", "dale, todas", "seguí hasta el final").
argument-hint: "[slug] [T#]"
---

Arguments: $ARGUMENTS

1. `change_get` with the slug (no slug: the only `approved` one). If several match, ask which.
2. If it is `proposed`, don't implement: show it and ask for approval, naming open questions by number. When the user approves, `change_transition` to `approved` with `aprobacion` = their exact words (`pendientes: true` if they continue with open questions). It creates the branch and logs it.
   - `approved` and the task depends on an open question: ask it first.
   - A part (`Parte N de M: después de \`<slug>\``) whose previous part isn't `done`: say so and ask whether to start anyway. A part born short gets its What and Tasks completed before asking for approval.
3. Be on the change's `branch`.
4. Reconcile with reality (`git log`, `git diff`, tests): a task done but unmarked → `task_complete`; one marked without evidence → `change_update` with `task_reopen` and why. If the branch was rebased (task commits no longer on it) → `change_update` with `resync_commits`.
5. Take the given task or the first pending one and implement it following `seckert:workflow` (tests by risk, only the affected test file while iterating; presentation checked against the `design` artifact with `seckert:design`).
6. Run the full suite once before committing.
7. Commit the task on the change's branch (Conventional Commits by default). No push unless asked.
8. `task_complete` with the task, the commit hash and the observed evidence in one line. It returns `done`, `total` and `tasks`: the roadmap.
9. If it was the last task: write new or changed rules with `spec_write`, summarize what changed and what you couldn't verify, and offer the next step in words, never command names ("¿lo verifico contra el What y el diseño?"; once it's good, close it and open the PR if they want).

One task per invocation unless the user asks for more.

## All of them

With "hacé todas" (or "dale, todas" on a `proposed` change, which approves it first), repeat steps 4-8 for each pending task, in order, without asking between tasks. Stop and say at which task, and why, when:

- the task depends on an open question;
- a test stays red after trying to fix it;
- a presentation task needs a `design` you can't open;
- the work turns out bigger than the plan (a new task, a schema change): propose the `change_update` first.

## Roadmap

End every reply on a change with its roadmap, from the last `change_get` or `task_complete` (no extra calls):

```
**Roadmap:** 2/4
- ✓ T1 …
- ✓ T2 …
- T3 … ← sigue
- T4 …
```

Task titles only, short. Then offer the next step in one question: "¿sigo con la T3 o hago todas?". When all are done, the roadmap shows n/n and the offer is to verify.
