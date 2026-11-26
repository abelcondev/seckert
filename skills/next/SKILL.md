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
4. Reconcile with `git log` against the marked tasks, without running tests: a task done but unmarked → `task_complete`; one marked without evidence → `change_update` with `task_reopen` and why. If the branch was rebased (task commits no longer on it) → `change_update` with `resync_commits`.
5. Take the given task or the first pending one and delegate it to the `seckert-implementer` agent, passing only the slug and the task id. It implements, checks presentation in the browser, runs the suite, commits and calls `task_complete`. Don't repeat that work here.
6. It returns `HECHA` with the commit, the evidence and the roadmap, or `PARADA` with the reason. On `PARADA`, stop and tell the user at which task and why: an open question goes as its number, a proposed `change_update` waits for their yes. If it says `NO VERIFICABLE (sin navegador)`, offer Chrome DevTools MCP in one line as `${CLAUDE_PLUGIN_ROOT}/skills/verify/navegador.md` says.
7. If it was the last task: write new or changed rules with `spec_write`, summarize what changed and what you couldn't verify, and offer the next step in words, never command names ("¿lo verifico contra el What y el diseño?"; once it's good, close it and open the PR if they want).

One task per invocation unless the user asks for more.

## All of them

With "hacé todas" (or "dale, todas" on a `proposed` change, which approves it first), call `seckert-implementer` for each pending task, in order, one at a time, without asking between tasks. Stop at the first `PARADA` and say at which task and why. The agent stops when the task depends on an open question, a test stays red, the `design` can't be opened or the work is bigger than the plan.

## Roadmap

End every reply on a change with its roadmap, from the last `change_get`, `task_complete` or the agent's reply (no extra calls):

```
**Roadmap:** 2/4
- ✓ T1 …
- ✓ T2 …
- T3 … ← sigue
- T4 …
```

Task titles only, short. Then offer the next step in one question: "¿sigo con la T3 o hago todas?". When all are done, the roadmap shows n/n and the offer is to verify.
