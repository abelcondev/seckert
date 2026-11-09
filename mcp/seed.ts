// Un change como issue del gh falso (mcp/fake-gh.mjs): lo usan los specs del MCP
// (mcp/fixture.ts) y el armado de los evals (evals/_fixture/changes.ts).
import { parseChange } from '../lib/change'
import { renderBody } from '../lib/issue'
import { criteriaOf, PLAN_NAME, planFromChange } from '../lib/issue-change'

// El Why del change es el Problem del issue; el What, sus criterios.
function whyOf(text: string): string {
  return text.match(/^## Why\n\n([\s\S]*?)\n*(?=^## )/m)?.[1]?.trim() || 'x'
}

// El issue número `number`, aprobado, con label seckert:change, el plan como
// artifact Plan y, si el change tiene diseño, el artifact Design.
export function changeIssue(text: string, number: number): Record<string, unknown> {
  const parsed = parseChange(text)
  const title = parsed.title ?? `change ${number}`
  const body = renderBody({
    problem: whyOf(text),
    outcome: title,
    criteria: criteriaOf(text),
    route: 'CHANGE',
    origin: { source: 'chat', date: '2026-11-01' },
  })
  const withIssue = text.replace(/^(---\n[\s\S]*?)(\n---\n)/, (_, head: string, end: string) => (/^issue:/m.test(head) ? head : `${head}\nissue: #${number}`) + end)
  const plan = planFromChange(withIssue)
  return {
    number,
    title,
    body,
    state: 'OPEN',
    labels: ['seckert:approved', 'seckert:change', 'type:feature'],
    comments: [],
    artifacts: [
      { number: 1, type: 'plan', name: PLAN_NAME, body: plan, versions: [plan] },
      ...(parsed.design ? [{ number: 2, type: 'link', name: 'Design', body: parsed.design, versions: [parsed.design] }] : []),
    ],
  }
}
