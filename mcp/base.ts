// tests_on_base: corre en la base los tests que fallan en la rama, en un worktree
// temporal fuera del proyecto, para saber si el fallo ya estaba (PREEXISTENTE) o
// es del change (FALLA). Ante la duda, FALLA.
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { baseBranch } from './repo'

const LOCKFILES = /(^|\/)(package\.json|package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?)$/
const TIMEOUT_MS = 5 * 60 * 1000

export type BaseResult = { test: string; veredicto: 'PREEXISTENTE' | 'FALLA'; motivo: string; comando: string }

function git(root: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

function refExists(root: string, ref: string): boolean {
  try {
    git(root, 'rev-parse', '--verify', '--quiet', ref)
    return true
  } catch {
    return false
  }
}

const shellQuote = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`

// El env de los tests en la base: el del servidor sin CLAUDE_PROJECT_DIR, que
// apunta al proyecto real y no al worktree temporal. Un test que arranca el
// servidor MCP lo heredaría y actuaría sobre el proyecto (ramas, HEAD).
function baseEnv(): NodeJS.ProcessEnv {
  const { CLAUDE_PROJECT_DIR: _project, ...env } = process.env
  return env
}

export function testsOnBase(root: string, input: { tests: string[]; runner: string }) {
  if (!input.tests.length) throw new Error('Pasá los tests que fallaron en la rama.')
  const branch = baseBranch(root)
  const ref = refExists(root, `origin/${branch}`) ? `origin/${branch}` : branch
  const base = git(root, 'merge-base', 'HEAD', ref)
  const all = (veredicto: BaseResult['veredicto'], motivo: string) =>
    input.tests.map(test => ({ test, veredicto, motivo, comando: `${input.runner} ${test}` }))

  const changed = git(root, 'diff', '--name-only', base, 'HEAD').split('\n').filter(Boolean)
  if (changed.some(file => LOCKFILES.test(file)))
    return { base: branch, resultados: all('FALLA', 'el change cambió dependencias, no pude comprobar la base') }

  const wt = join(mkdtempSync(join(tmpdir(), 'seckert-base-')), 'base')
  try {
    git(root, 'worktree', 'add', '--quiet', '--detach', wt, base)
    if (existsSync(join(root, 'node_modules'))) symlinkSync(join(root, 'node_modules'), join(wt, 'node_modules'))

    const resultados: BaseResult[] = input.tests.map(test => {
      const comando = `${input.runner} ${test}`
      if (!existsSync(join(wt, test))) return { test, veredicto: 'FALLA', motivo: 'el test no existe en la base', comando }
      const ran = spawnSync('sh', ['-c', `${input.runner} ${shellQuote(test)}`], { cwd: wt, timeout: TIMEOUT_MS, encoding: 'utf8', env: baseEnv() })
      if (ran.error || ran.status === null || ran.status === 126 || ran.status === 127)
        return { test, veredicto: 'FALLA', motivo: `no se pudo correr en la base (${ran.error?.message ?? `salida ${ran.status ?? 'cortada'}`})`, comando }
      return ran.status === 0
        ? { test, veredicto: 'FALLA', motivo: 'pasa en la base: el fallo es del change', comando }
        : { test, veredicto: 'PREEXISTENTE', motivo: 'también falla en la base', comando }
    })
    return { base: branch, merge_base: base.slice(0, 7), resultados }
  } catch (error) {
    return { base: branch, resultados: all('FALLA', `no se pudo preparar la base (${error instanceof Error ? error.message.split('\n')[0] : error})`) }
  } finally {
    try {
      git(root, 'worktree', 'remove', '--force', wt)
    } catch {
      // ya no existía
    }
    rmSync(join(wt, '..'), { recursive: true, force: true })
  }
}
