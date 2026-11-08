# 📮 Issue contract (v2)

seckert works GitHub issues that follow this contract. Any tool can create them: a script, a GitHub Action, or `seckert-meetings`. seckert only asks that the issue keeps the contract.

## Where it lives

The issue lives in the project's GitHub repo, the one of the `origin` remote. seckert reads and writes it with `gh`.

## Language

- Section headings are always in English, exactly as below.
- The content is written in the language of the request. A request in Spanish produces an issue in Spanish.

## Only decided things

An issue carries decisions, not open discussions.

- Research and comparisons (for example, "Stripe or Mercado Pago") happen before the issue exists. With Claude Code, they happen in the session.
- What was decided goes to `## Decisions`, with who decided and when.
- Small pending doubts go to `## Open questions`. An issue with open questions stays in `draft` and cannot be approved. Answering one moves it to `## Decisions`.

## Body

The first line is the marker with the contract version. Then come the sections, in this order.

```markdown
<!-- seckert:issue v2 -->

## Problem

The accountant needs the month's orders, and today they are copied by hand.

> I need a button that downloads everything to Excel at the end of the month.

## Outcome

The month's orders download as one file with one click.

## Acceptance criteria

- [ ] There is a "Download CSV" button on the orders list
- [ ] When I click it, then a CSV downloads with date, customer and total

## Decisions

- Separator ; — Abel, 2026-11-09

## Out of scope

- Native Excel export

## Constraints

- Do not change the orders API

## References

- src/Orders.tsx

## Open questions

- **P1** Do we include cancelled orders? — decide: Abel

## Route

FIX: one screen and an export, no money involved

## Origin

- Source: Weekly meeting with Acme
- Date: 2026-11-06
- Client: Acme
- Requested by: Juan
```

| Section | What it holds | Required |
|---|---|---|
| `## Problem` | Who is affected, what happens today and why it matters. The client's literal quote goes in lines that start with `> `. | Yes; the quote is optional |
| `## Outcome` | The expected result, in one or two sentences | Yes |
| `## Acceptance criteria` | One `- [ ]` checkbox per verifiable criterion. "When…, then…" is suggested for behavior. | Yes, at least one |
| `## Decisions` | `- <decision> — <who>, <YYYY-MM-DD>` | No |
| `## Out of scope` | What must not be done, one `- ` item each | No |
| `## Constraints` | Limits the work must respect | No |
| `## References` | Files, links or related issues | No |
| `## Open questions` | `- **P1** <question> — decide: <who>` | No |
| `## Route` | `FIX`, `SPEC` or `CHANGE`, optionally followed by `: <why>` | Yes |
| `## Origin` | `- Source:`, `- Date:`, `- Client:` and `- Requested by:` lines. Any can be missing; with none, a single `-`. | Yes |

Optional sections are left out when empty.

The route is a suggestion for whoever works the issue:

- **FIX**: a fix or a small change.
- **SPEC**: changes the value of an existing rule.
- **CHANGE**: a feature or a large or sensitive change that needs a plan.

## Labels

| Label | Meaning |
|---|---|
| `seckert:draft`, `seckert:approved`, `seckert:discarded` | Triage. Exactly one. |
| `type:feature`, `type:fix`, `type:task` | Issue type. At most one. GitHub's native issue types exist only for organizations, so seckert uses labels. |

The rest of the state comes from GitHub:

| State | How it shows |
|---|---|
| `draft` | Label `seckert:draft` |
| `approved` | Label `seckert:approved` |
| `in-progress` | An approved issue with a linked branch (`gh issue develop`) |
| `in-review` | An open PR that links it with `Fixes #n` |
| `closed` | The merge of that PR |
| `discarded` | Label `seckert:discarded` and the issue closed as not planned |

## Artifacts

Issue artifacts are files attached to an issue, with version history. seckert reserves two names:

| Name | Type | Who writes it |
|---|---|---|
| `Design` | `link` | Whoever creates the issue: a link to the design (a claude.ai artifact, Figma…) |
| `Plan` | `plan` | seckert only, when it takes a CHANGE. Producers must not create it. |

The body belongs to whoever writes the issue. seckert never writes the plan in the body while artifacts are available.

## Rules for producers

- **Always create in `draft`.** Approving is a person's call, and seckert keeps their words as a comment.
- **Keep the marker and the headings as they are.** seckert skips issues it cannot read.
- **Create the labels if they are missing.** Suggested colors: `d4c5f9` draft, `0e8a16` approved, `cccccc` discarded, `a2eeef` feature, `d73a4a` fix, `ededed` task.

## Versions

| Version | Changes |
|---|---|
| v1 | `## Context`, `## Acceptance criteria`, `## Route`, `## Origin` with `Meeting`. The marker without a version is v1. |
| v2 | `## Problem` replaces `## Context`. Adds `## Outcome`, `## Decisions`, `## Out of scope`, `## Constraints`, `## References`, `## Open questions`, the route's why, and `Source` and `Requested by` in `## Origin`. |

- A change that does not break existing readers, such as a new optional field, keeps the version.
- A change that breaks readers bumps it.
- seckert reads every version it knows. A newer version fails with a message asking to update seckert.
