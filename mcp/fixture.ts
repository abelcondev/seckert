// Un repo de prueba para los specs del MCP: git con origin en GitHub, el `gh`
// falso (fake-gh.mjs) en el PATH y el servidor conectado por stdio. Los changes
// viven en su issue: `seedChange` los guarda en el estado del gh falso y
// `changeText` devuelve el texto tal como lo ve el servidor.
import { execFileSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

import { parseBody } from '../lib/issue'
import { changeFromIssue, PLAN_NAME } from '../lib/issue-change'
import { changeIssue } from './seed'
import { serverEnv } from './test-env'

const SERVER = resolve(import.meta.dir, 'dist/server.mjs')
const FAKE = resolve(import.meta.dir, 'fake-gh.mjs')

export type Db = { issues: Record<string, any>[]; calls: string[][]; artifactsUnavailable?: boolean; board?: unknown }
export type Result = { isError?: boolean; content: { text: string }[] }

export type Fixture = {
  dir: string
  repo: string
  state: string
  client: Client
  git: (...args: string[]) => string
  db: () => Db
  saveDb: (db: Db) => void
  call: (name: string, args: Record<string, unknown>) => Promise<Result>
  seedChange: (text: string) => string
  changeText: (slug: string) => string
  close: () => Promise<void>
}

// `cwd`: la subcarpeta del repo donde arranca el servidor (por defecto, la raíz).
export async function fixture(prefix: string, setup?: (repo: string, git: (...args: string[]) => string) => void, cwd = '.'): Promise<Fixture> {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  const repo = join(dir, 'repo')
  mkdirSync(repo)
  const git = (...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: repo, encoding: 'utf8' }).trim()
  git('init', '-q', '-b', 'main')
  git('remote', 'add', 'origin', 'git@github.com:acme/tienda.git')
  writeFileSync(join(repo, 'README.md'), 'x\n')
  setup?.(repo, git)
  git('add', '-A')
  git('commit', '-q', '-m', 'init')

  const bin = join(dir, 'bin')
  mkdirSync(bin)
  writeFileSync(join(bin, 'gh'), `#!/bin/sh\nexec node "${FAKE}" "$@"\n`)
  chmodSync(join(bin, 'gh'), 0o755)
  const state = join(dir, 'gh.json')
  writeFileSync(state, JSON.stringify({ issues: [], calls: [] }))

  const client = new Client({ name: 'test', version: '0.0.0' })
  const env = serverEnv({ PATH: `${bin}:${process.env.PATH}`, FAKE_GH_STATE: state, TZ: 'UTC' })
  await client.connect(new StdioClientTransport({ command: 'node', args: [SERVER], env, cwd: join(repo, cwd) }))

  const db = (): Db => JSON.parse(readFileSync(state, 'utf8'))
  const saveDb = (data: Db) => writeFileSync(state, JSON.stringify(data, null, 2))

  // Un issue aprobado con label seckert:change y el plan del change como artifact. Devuelve su número.
  const seedChange = (text: string) => {
    const data = db()
    const number = data.issues.length + 1
    data.issues.push(changeIssue(text, number))
    saveDb(data)
    return String(number)
  }

  // El change como lo arma el servidor: el body del issue más su plan.
  const changeText = (slug: string) => {
    for (const issue of db().issues) {
      const plan = issue.artifacts?.find((a: { name: string }) => a.name === PLAN_NAME)?.body
      if (!plan || !new RegExp(`^branch: \\S+/${slug}$`, 'm').test(plan)) continue
      const body = parseBody(issue.body)
      return changeFromIssue({ title: issue.title, body, plan, design: null })
    }
    throw new Error(`no hay un change ${slug} en el gh falso`)
  }

  const call = async (name: string, args: Record<string, unknown>) => (await client.callTool({ name, arguments: args })) as Result

  return {
    dir,
    repo,
    state,
    client,
    git,
    db,
    saveDb,
    call,
    seedChange,
    changeText,
    close: async () => {
      await client.close()
      rmSync(dir, { recursive: true, force: true })
    },
  }
}
