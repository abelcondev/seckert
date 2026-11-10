---
name: change
description: Writes the plan for a large change in its GitHub issue and waits for approval, without touching code. Use it for features or large changes (schema, new money or permissions logic, AI, several parts) or when the user says "armá la propuesta", "planifiquemos".
argument-hint: <change description> [design artifact url]
---

Request:

$ARGUMENTS

0. The change lives in an issue. If there is none yet, follow `seckert:workflow`: `issue_create` (route CHANGE, the user's words in the criteria and the quote), approve it with the user's words and `issue_take` it. The plan starts from there.
1. Explore read-only: the affected code, related `sdd/specs/`, existing helpers and the real test command.
2. Product decisions you can't infer go to the change's open questions, not only the chat.
3. **Does it fit one change?** If it would exceed ~8 tasks or bundles parts that can be reviewed and merged separately and work on their own (base data model, a flow on top, an AI layer), split the issue into sub-issues as `seckert:tomar` says (step 2), and plan each part when it is taken. A presentation-only part (layout, a screen, no data, money or permissions) is a FIX.
4. Create it with `change_create` and `issue` = the number (attaches the `Plan` artifact: `status: proposed`, `feature/<slug>`, numbered questions). Why and What come from the issue; to change a What point later, use `change_update`, which writes the criteria back to the issue.
   - `slug`: the branch name without `feature/`.
   - `tasks`: small; separate logic (mark the sensitive ones: money, permissions, data) from presentation.
   - `pedido`: the request above, or the issue's title and quote, verbatim (goes to `L1`).
   - `diagram`: Mermaid, only when the change touches the schema (`erDiagram` with the tables and relations involved) or a flow of several steps (`flowchart`). If it changes something existing, show before and after. Keep it small: only what the change touches. Without schema or flow, no diagram.
   - Write every field following the writing rules in `seckert:workflow`.
5. Don't touch code. Show the change in a few lines: what you propose, how many tasks it has with their short titles (the roadmap, as in `seckert:next`) and, if there are open questions, the first one with your recommendation. Always end by offering both ways, together with the question if there is one: "¿las hago todas o una por una?" or "respondé la P1 y decime si las hago todas o una por una".

## Iterating the proposal

While `proposed`, the change is the conversation's working document:

- Every adjustment ("sacá el punto 3", "partí T2", "¿y si usamos X?") goes into **this same change** with one `change_update` call (`what_edit`, `what_remove`, `task_remove`, `task_split`, `question_add`…), never a new change or only the chat. Splitting into parts follows step 3: log the split with `change_update` and create the other parts as sub-issues.
- Open questions are numbered (`P1`, `P2`…; the tool assigns them and they never shift); say the number when showing them so the user can answer with it ("1: sí", "P2 con email").
- When the user answers one, one `change_update`: `question_answer` (deletes it and logs the answer with the user's words) plus `what_add` or `task_add` with what it decides.
- If an adjustment changes the schema or the flow, update the diagram in the same call (`diagram`).
- After each adjustment, reply briefly: what changed in the plan and the next open question, if any.
- Ask for approval ("sí" to continue) when no questions remain. If the user approves with open questions, name them in one line and ask whether to continue; if yes, approve with `pendientes: true`.
