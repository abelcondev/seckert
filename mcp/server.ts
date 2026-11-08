// Servidor MCP de seckert: los changes de sdd/changes se leen y escriben con
// herramientas en vez de editar el markdown a mano. Se compila a un solo
// archivo (mcp/dist/server.mjs) que viene en el plugin; solo necesita node.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

import {
  completeTaskInRepo,
  createChange,
  detail,
  findChange,
  projectRoot,
  readChanges,
  recordVerify,
  updateChange,
  writeSpec,
  summary,
  transitionChange,
} from './repo'
import { testsOnBase } from './base'
import { prDraft, releaseDraft } from './pr'
import { issueAnswer, issueCreate, issueGet, issueList, issueTake, issueTransition } from './issues'
import { checkTransition } from '../lib/issue'

const server = new McpServer({ name: 'seckert', version: '1.0.0' })

function json(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] }
}

function failure(error: unknown) {
  return { isError: true, content: [{ type: 'text' as const, text: error instanceof Error ? error.message : String(error) }] }
}

server.registerTool(
  'change_list',
  {
    description:
      'Lists the changes in sdd/changes with status, tasks done/total, next task, open questions, branch and last verification. Open ones only (proposed and approved) by default.',
    inputSchema: { done: z.boolean().optional().describe('Also include done changes') },
    annotations: { readOnlyHint: true },
  },
  async ({ done }) => {
    try {
      const changes = readChanges(projectRoot()).filter(change => done || change.status !== 'done')
      return json(changes.map(summary))
    } catch (error) {
      return failure(error)
    }
  },
)

server.registerTool(
  'change_get',
  {
    description:
      'A change, structured: What as a list of points, tasks with their commit, open questions (P1, P2…), last verification and how many times each What point failed. No slug: the only approved one.',
    inputSchema: { slug: z.string().optional().describe('The change slug, without the date') },
    annotations: { readOnlyHint: true },
  },
  async ({ slug }) => {
    try {
      return json(detail(findChange(projectRoot(), slug)))
    } catch (error) {
      return failure(error)
    }
  },
)

server.registerTool(
  'change_create',
  {
    description:
      'Creates a change proposal in sdd/changes with the seckert template: status proposed, today\'s date, branch feature/<slug>, numbered questions (P1, P2…) and L1 with the user\'s request verbatim. Never overwrites an existing change: to adjust a proposal, use change_update. Write the content in the user\'s language.',
    inputSchema: {
      slug: z.string().describe('kebab-case, no date'),
      title: z.string(),
      why: z.string().optional().describe('The problem, in 1–3 sentences. Omit when the change lives in its issue: the issue gives Why and What'),
      what: z.array(z.string()).min(1).optional().describe('Observable behavior, one point per item, quoting the user literally'),
      tasks: z.array(z.string()).min(1).describe('Small tasks, without the "T1"; mark the sensitive ones (money, permissions, data)'),
      questions: z.array(z.string()).optional().describe('Decisions missing before approval'),
      specs: z.array(z.string()).optional().describe('sdd/specs areas it touches'),
      design: z.string().optional().describe('Design artifact URL, if the request has one'),
      issue: z.string().optional().describe('The GitHub issue number it comes from (issue_take), without #; goes to the frontmatter as issue: #n'),
      diagram: z
        .string()
        .optional()
        .describe('Mermaid source, only if the change touches the schema (erDiagram) or a multi-step flow (flowchart); before and after if it changes an existing one. Goes to ## Diagram'),
      testing: z
        .object({ runner: z.string().optional(), nivel: z.string().optional(), logica: z.string().optional(), presentacion: z.string().optional() })
        .optional(),
      pedido: z.string().describe('The user\'s original request, verbatim, unedited'),
    },
  },
  async args => {
    try {
      return json(createChange(projectRoot(), args))
    } catch (error) {
      return failure(error)
    }
  },
)

server.registerTool(
  'change_transition',
  {
    description:
      'Approves (proposed → approved) or closes (approved → done) a change. Only when the user asked: `aprobacion` is their exact words from their last message ("dale", "cerralo"). Approving creates or switches to the feature/<slug> branch from the base and logs it. With open questions (approving) or pending tasks (closing) it fails: ask the user and, if they continue anyway, repeat with pendientes: true.',
    inputSchema: {
      slug: z.string().optional().describe('No slug: the only approved one'),
      to: z.enum(['approved', 'done']),
      aprobacion: z.string().describe('The user\'s exact words approving or closing'),
      pendientes: z.boolean().optional().describe('The user confirmed continuing with open questions or pending tasks'),
    },
    annotations: { destructiveHint: false },
  },
  async args => {
    try {
      return json(transitionChange(projectRoot(), args))
    } catch (error) {
      return failure(error)
    }
  },
)

server.registerTool(
  'task_complete',
  {
    description:
      'Marks a change task as done, with the commit implementing it (it must exist on the current branch), and logs the observed evidence (test output, command, running app). Commit before calling it.',
    inputSchema: {
      slug: z.string().optional().describe('No slug: the only approved one'),
      task: z.string().regex(/^T\d+$/).describe('The task id, e.g. T2'),
      commit: z.string().describe('The commit hash'),
      evidencia: z.string().describe('What was observed that proves it, in one line'),
    },
  },
  async args => {
    try {
      return json(completeTaskInRepo(projectRoot(), args))
    } catch (error) {
      return failure(error)
    }
  },
)

const op = z.discriminatedUnion('op', [
  z.object({ op: z.literal('question_answer'), id: z.string(), log: z.string().describe('The answer and why, quoting the user') }),
  z.object({ op: z.literal('question_add'), text: z.string() }),
  z.object({ op: z.literal('what_add'), text: z.string() }),
  z.object({ op: z.literal('what_edit'), point: z.string().describe('The point, exactly'), text: z.string() }),
  z.object({ op: z.literal('what_remove'), point: z.string(), log: z.string().describe('Why') }),
  z.object({ op: z.literal('task_add'), text: z.string() }),
  z.object({ op: z.literal('task_edit'), id: z.string(), text: z.string() }),
  z.object({ op: z.literal('task_split'), id: z.string(), into: z.array(z.string()).min(2) }),
  z.object({ op: z.literal('task_reopen'), id: z.string(), log: z.string().describe('Why') }),
  z.object({ op: z.literal('task_remove'), id: z.string(), log: z.string().describe('Why') }),
  z.object({ op: z.literal('log'), text: z.string() }),
  z.object({ op: z.literal('diagram'), text: z.string().describe('Mermaid for ## Diagram; empty removes it') }),
])

server.registerTool(
  'change_update',
  {
    description:
      'Edits a change: the preferred way to change it; status goes through change_transition and marking a task through task_complete. Operations apply in order and all-or-nothing; numbers (Pn, Tn, Ln) are assigned for you and never shift. Answering a question: question_answer (deletes Pn, logs it) plus what_add or task_add with the answer. resync_commits: after a rebase, finds each done task\'s commit by its message and updates the hash. Returns the new ids.',
    inputSchema: {
      slug: z.string().optional().describe('No slug: the only approved one'),
      ops: z.array(op).optional(),
      resync_commits: z.boolean().optional(),
    },
  },
  async args => {
    try {
      return json(updateChange(projectRoot(), args))
    } catch (error) {
      return failure(error)
    }
  },
)

server.registerTool(
  'spec_write',
  {
    description:
      'Writes, replaces or removes one rule of sdd/specs/<area>.md (one rule per ##, how the system behaves today, no history). The preferred way to edit specs. Creates the area if missing.',
    inputSchema: {
      area: z.string().describe('kebab-case, the file name without .md'),
      title: z.string().describe('The rule heading, without ##'),
      body: z.string().optional().describe('The rule as it works today'),
      remove: z.boolean().optional(),
      area_title: z.string().optional().describe('Heading for a new area file'),
    },
  },
  async args => {
    try {
      return json(writeSpec(projectRoot(), args))
    } catch (error) {
      return failure(error)
    }
  },
)

server.registerTool(
  'verify_record',
  {
    description:
      'Records a change verification in its Log with a fixed format, reopens the tasks of failing points and, when a point fails for the third time, doesn\'t reopen it: it becomes an open question. Each row names a What point exactly (visual vs design as "Diseño"). Returns the reopened tasks and the points that reached the third time.',
    inputSchema: {
      slug: z.string().optional().describe('No slug: the only approved one'),
      filas: z
        .array(
          z.object({
            punto: z.string().describe('The What point, exactly, or "Diseño"'),
            veredicto: z.enum(['PASA', 'FALLA', 'VISUAL', 'NO VERIFICABLE']),
            evidencia: z.string().optional().describe('Command and result, or why it fails'),
            tareas: z.array(z.string()).optional().describe('If FALLA: the tasks to reopen, e.g. ["T1"]'),
            recomendacion: z.string().optional().describe('If FALLA: what you\'d change in the approach, in case it\'s the third time'),
          }),
        )
        .min(1),
      preexistentes: z.array(z.string()).optional().describe('Tests already failing on the base'),
      comandos: z.array(z.string()).optional().describe('Commands run'),
    },
  },
  async args => {
    try {
      return json(recordVerify(projectRoot(), args))
    } catch (error) {
      return failure(error)
    }
  },
)

server.registerTool(
  'tests_on_base',
  {
    description:
      'Checks whether tests failing on the branch already failed on the base (merge-base with develop/dev or main): runs them in a temporary worktree outside the project, with the project\'s node_modules linked, and removes it afterwards. Returns PREEXISTENTE (also fails on the base) or FALLA (passes on the base, doesn\'t exist there, couldn\'t run, or the change touched package.json or a lockfile).',
    inputSchema: {
      tests: z.array(z.string()).min(1).describe('Failing test files, relative to the root'),
      runner: z.string().describe('The project\'s test command, without the file (e.g. "bun test")'),
    },
  },
  async args => {
    try {
      return json(testsOnBase(projectRoot(), args))
    } catch (error) {
      return failure(error)
    }
  },
)

server.registerTool(
  'pr_draft',
  {
    description:
      'Draft PR for a change: base by branch flow (develop in gitflow, main in PRs only and for hotfix/*), Conventional Commits title and body with Why, What, Testing, Risk (sensitive tasks and delicate files in the diff), How to revert (for you to fill in: no commands or SQL) and Evidence (last verification). With an issue (`issue: #n` in the change, or `issue` for a FIX or SPEC without a change) the body starts with `Fixes #n`, so GitHub shows the issue in-review and the merge closes it. Review the title and fill in How to revert before opening it.',
    inputSchema: {
      slug: z.string().optional().describe('No slug: the only approved one'),
      issue: z.string().optional().describe('Issue number, for a FIX or SPEC taken from an issue without a change (uses the current branch); if a change has that issue, its change'),
    },
    annotations: { readOnlyHint: true },
  },
  async args => {
    try {
      return json(prDraft(projectRoot(), args))
    } catch (error) {
      return failure(error)
    }
  },
)

server.registerTool(
  'release_draft',
  {
    description:
      'Release draft: proposed version from the last tag (feat bumps minor, only fix bumps patch, breaking bumps major), release/x.y.z branch and where it starts from by flow, the project\'s version files, Features/Fixes notes from git log and the done changes since the tag. Rewrite the notes in user language.',
    inputSchema: { version: z.string().optional().describe('x.y.z, if the user gave one') },
    annotations: { readOnlyHint: true },
  },
  async args => {
    try {
      return json(releaseDraft(projectRoot(), args))
    } catch (error) {
      return failure(error)
    }
  },
)

const STATE = z.enum(['draft', 'approved', 'in-progress', 'in-review', 'closed', 'discarded'])

server.registerTool(
  'issue_create',
  {
    description:
      'Creates a seckert issue (contract v2, docs/contrato-issue.md) in the GitHub repo of `origin`, always as draft (label seckert:draft). Write the content in the language of the request; section headings stay in English. Only decided things go in: an open discussion stays in the session, and small pending doubts go to `questions`, which keep the issue in draft until answered. Approving it is a separate step with issue_transition and the user\'s words.',
    inputSchema: {
      title: z.string(),
      problem: z.string().describe('Who is affected, what happens today and why it matters, in a few sentences'),
      quote: z.string().optional().describe('What the client said, verbatim'),
      outcome: z.string().describe('The expected result, in one or two sentences'),
      criteria: z.array(z.string()).min(1).describe('Verifiable acceptance criteria; "When…, then…" is suggested for behavior'),
      decisions: z
        .array(z.object({ text: z.string(), by: z.string().optional(), date: z.string().optional() }))
        .optional()
        .describe('What is already decided, with who and when (YYYY-MM-DD)'),
      outOfScope: z.array(z.string()).optional().describe('What must not be done'),
      constraints: z.array(z.string()).optional().describe('Limits, e.g. "do not change the orders API"'),
      references: z.array(z.string()).optional().describe('Files, links or related issues'),
      questions: z
        .array(z.object({ id: z.string().regex(/^P\d+$/), text: z.string(), owner: z.string().optional() }))
        .optional()
        .describe('Small pending doubts, numbered P1, P2…, with who decides'),
      route: z.enum(['FIX', 'SPEC', 'CHANGE']),
      kind: z.enum(['feature', 'fix', 'task']).optional().describe('Issue type, as the label type:<kind>'),
      routeWhy: z.string().optional().describe('Why that route, in a few words'),
      origin: z
        .object({ source: z.string().optional(), date: z.string().optional(), client: z.string().optional(), requestedBy: z.string().optional() })
        .default({})
        .describe('source: the meeting, chat or document it comes from'),
    },
    annotations: { destructiveHint: false },
  },
  async args => {
    try {
      return json(issueCreate(projectRoot(), args))
    } catch (error) {
      return failure(error)
    }
  },
)

server.registerTool(
  'issue_get',
  {
    description:
      'A seckert issue from GitHub, structured, with its state: draft, approved and discarded come from the seckert:* label; in-progress (linked branch), in-review (linked open PR) and closed (merged) are read from GitHub.',
    inputSchema: { id: z.string().describe('The issue number') },
    annotations: { readOnlyHint: true },
  },
  async ({ id }) => {
    try {
      return json(issueGet(projectRoot(), id))
    } catch (error) {
      return failure(error)
    }
  },
)

server.registerTool(
  'issue_list',
  {
    description: 'Lists seckert issues (id, title, state, route, kind, url). Open ones by default; with state, all issues in that state; with kind, only that type.',
    inputSchema: { state: STATE.optional(), kind: z.enum(['feature', 'fix', 'task']).optional() },
    annotations: { readOnlyHint: true },
  },
  async ({ state, kind }) => {
    try {
      return json(issueList(projectRoot(), state, kind))
    } catch (error) {
      return failure(error)
    }
  },
)

server.registerTool(
  'issue_answer',
  {
    description:
      'Answers an open question of a seckert issue: removes it from Open questions and adds it to Decisions with who and today\'s date, and leaves the answer as a comment. An issue with open questions cannot be approved. Write `decision` in the issue\'s language, as the decision itself (e.g. "Separator ;").',
    inputSchema: {
      id: z.string().describe('The issue number'),
      question: z.string().regex(/^P\d+$/).describe('P1, P2…'),
      answer: z.string().describe('The answer, in the user\'s words'),
      decision: z.string().optional().describe('The decision as it should read in Decisions; default: the question plus the answer'),
      by: z.string().optional().describe('Who decided'),
    },
    annotations: { destructiveHint: false },
  },
  async args => {
    try {
      return json(issueAnswer(projectRoot(), args))
    } catch (error) {
      return failure(error)
    }
  },
)

server.registerTool(
  'issue_take',
  {
    description:
      'Takes an approved seckert issue to work on it: creates its branch linked to the issue from the base with `gh issue develop` (feature/<slug> for CHANGE, fix/<slug> for FIX and SPEC) and switches to it, so GitHub shows it in-progress. An in-progress issue is resumed on its linked branch. Fails on a draft (approve it first) or on an issue in review, closed or discarded, and with uncommitted changes. Returns the issue with its branch.',
    inputSchema: { id: z.string().describe('The issue number') },
    annotations: { destructiveHint: false },
  },
  async ({ id }) => {
    try {
      return json(issueTake(projectRoot(), id))
    } catch (error) {
      return failure(error)
    }
  },
)

server.registerTool(
  'issue_transition',
  {
    description:
      'Moves a seckert issue\'s triage: draft → approved (only when the user approved it: `aprobacion` is their exact words, left as a comment on the issue) or → discarded (closes it as not planned, with an optional reason). in-progress, in-review and closed are never set by hand: GitHub shows them.',
    inputSchema: {
      id: z.string(),
      to: STATE,
      aprobacion: z.string().optional().describe('The user\'s exact words approving it'),
      motivo: z.string().optional().describe('Why it is discarded'),
    },
    annotations: { destructiveHint: false },
  },
  async ({ id, to, aprobacion, motivo }) => {
    try {
      if (to !== 'approved' && to !== 'discarded') throw new Error(checkTransition('approved', to)!)
      return json(issueTransition(projectRoot(), { id, to, aprobacion, motivo }))
    } catch (error) {
      return failure(error)
    }
  },
)

// `node server.mjs --context`: los changes abiertos para el contexto de inicio
// (scripts/session-context.sh), con el mismo lector que las herramientas.
if (process.argv.includes('--context')) {
  const open = readChanges(projectRoot()).filter(change => change.status === 'proposed' || change.status === 'approved')
  if (open.length) {
    const lines = open.map(change => {
      const { done, total } = summary(change)
      return `- ${change.file} (${change.status}, ${done}/${total} tasks)`
    })
    process.stdout.write(`\nOpen changes:\n${lines.join('\n')}\n`)
  }
} else {
  await server.connect(new StdioServerTransport())
}
