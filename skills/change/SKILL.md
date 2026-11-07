---
name: change
description: Writes the proposal for a large change in sdd/changes and waits for approval, without touching code. Use it for features or large changes (schema, new money or permissions logic, AI, several parts) or when the user says "armá la propuesta", "planifiquemos".
argument-hint: <change description> [design artifact url]
---

Request:

$ARGUMENTS

1. Explore read-only: the affected code, related `sdd/specs/`, existing helpers and the real test command.
2. Product decisions you can't infer go to the change's open questions, not only the chat.
3. **Does it fit one change?** Split it if it would exceed ~8 tasks or bundles parts that can be reviewed and merged separately and work on their own (base data model, a flow on top, an AI layer). Then:
   - One change per part, in build order; each `why` starts with `Parte N de M: después de \`<previous slug>\``.
   - Write only the first one in full; the rest are born short (Why, What, known open questions, rough Tasks). User quotes go to the matching part.
   - A presentation-only part (layout, a screen, no data, money or permissions) gets no change: it's a FIX for later.
   - When showing it, name the parts one line each and offer to merge them into one change.
4. Create it with `change_create` (writes the template: `status: proposed`, date, `feature/<slug>`, numbered questions):
   - `design`: the artifact URL if the request has one. Don't describe visuals; that's the artifact.
   - `what`: observable behavior, quoting the user literally.
   - `tasks`: small; separate logic (mark the sensitive ones: money, permissions, data) from presentation.
   - `pedido`: the request above, verbatim (goes to `L1`).
   - `diagram`: Mermaid, only when the change touches the schema (`erDiagram` with the tables and relations involved) or a flow of several steps (`flowchart`). If it changes something existing, show before and after. Keep it small: only what the change touches. Without schema or flow, no diagram.
   - Write every field following the writing rules in `seckert:workflow`.
5. Don't touch code. Show the change in a few lines: what you propose and, if there are open questions, the first one with your recommendation.

## Iterating the proposal

While `proposed`, the change is the conversation's working document:

- Every adjustment ("sacá el punto 3", "partí T2", "¿y si usamos X?") goes into **this same change** with one `change_update` call (`what_edit`, `what_remove`, `task_remove`, `task_split`, `question_add`…), never a new change or only the chat. Splitting into parts follows step 3: `git mv` this one to the first part, log the split with `change_update` and create the rest with `change_create`.
- Open questions are numbered (`P1`, `P2`…; the tool assigns them and they never shift); say the number when showing them so the user can answer with it ("1: sí", "P2 con email").
- When the user answers one, one `change_update`: `question_answer` (deletes it and logs the answer with the user's words) plus `what_add` or `task_add` with what it decides.
- If an adjustment changes the schema or the flow, update the diagram in the same call (`diagram`).
- After each adjustment, reply briefly: what changed in the file and the next open question, if any.
- Ask for approval ("sí" to continue) when no questions remain. If the user approves with open questions, name them in one line and ask whether to continue; if yes, approve with `pendientes: true`.
