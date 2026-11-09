// Los specs que usan el gh falso no tocan el proyecto de quien los corre, aunque
// hereden CLAUDE_PROJECT_DIR (tests_on_base los corre desde el servidor MCP de
// Claude Code, que la tiene). Antes, issue_take hacía `git switch -c` ahí.
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dir, '..')
let sentinel: string
const git = (...args: string[]) => execFileSync('git', args, { cwd: sentinel, encoding: 'utf8' }).trim()

beforeAll(() => {
  // Un proyecto con origin en GitHub, como el repo real del plugin.
  sentinel = mkdtempSync(join(tmpdir(), 'seckert-centinela-'))
  git('init', '-q', '-b', 'main')
  git('remote', 'add', 'origin', 'git@github.com:acme/real.git')
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'init')
})

afterAll(() => rmSync(sentinel, { recursive: true, force: true }))

for (const spec of ['issues.spec.ts', 'issue-change.spec.ts', 'board.spec.ts']) {
  test(`${spec} con CLAUDE_PROJECT_DIR heredado no crea ramas ni cambia HEAD en ese proyecto`, () => {
    const ran = spawnSync('bun', ['test', join('mcp', spec)], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: sentinel } })
    expect(git('branch', '--format=%(refname:short)')).toBe('main')
    expect(git('status', '--porcelain')).toBe('')
    expect(ran.status).toBe(0)
  }, 60_000)
}
