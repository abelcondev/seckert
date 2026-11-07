---
name: status
description: Shows the state of the changes in sdd/changes. Use it when the user asks "¿en qué estamos?", "¿qué falta?", "¿cómo vamos?" or wants a summary of pending work.
argument-hint: "[slug]"
allowed-tools: Read, Glob, Grep, Bash(git log:*), Bash(git status:*), mcp__plugin_seckert_seckert__change_list, mcp__plugin_seckert_seckert__change_get
---

Arguments: $ARGUMENTS

With a slug, `change_get`; otherwise `change_list` (open ones).

For each: name, status, tasks done/total, next task, whether it has `design` and the last verification. Flag tasks marked without a commit and `proposed` changes waiting for approval, with their open questions by number.

End with one line listing the `sdd/specs/` areas and their rule count (`## `).

Read-only: change nothing.
