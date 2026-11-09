---
name: status
description: Shows the state of the seckert issues on GitHub and their changes. Use it when the user asks "¿en qué estamos?", "¿qué falta?", "¿cómo vamos?" or wants a summary of pending work.
argument-hint: "[slug]"
allowed-tools: Read, Glob, Grep, Bash(git log:*), Bash(git status:*), mcp__plugin_seckert_seckert__change_list, mcp__plugin_seckert_seckert__change_get, mcp__plugin_seckert_seckert__issue_list
---

Arguments: $ARGUMENTS

With a slug, `change_get`; otherwise `change_list` (open ones).

For each: name, status, tasks done/total, next task, whether it has `design` and the last verification. Flag tasks marked without a commit and `proposed` changes waiting for approval, with their open questions by number.

Then the seckert issues: `issue_list` (open ones), grouped by state in flow order (draft, approved, in-progress, in-review), one line each: `#id title (route)`. Flag `draft` ones as waiting for the user's triage. If `issue_list` fails (no GitHub `origin`, `gh` without login), say so in one line and go on.

End with one line listing the `sdd/specs/` areas and their rule count (`## `).

Read-only: change nothing.
