// tests_on_base y checks_on_base: corren en la base lo que falla en la rama, en
// un worktree temporal fuera del proyecto, para saber si el fallo ya estaba
// (PREEXISTENTE) o es del change (FALLA). Ante la duda, FALLA.
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

// Prepara la base en un worktree temporal fuera del proyecto, con el
// node_modules del proyecto enlazado, corre `fn` ahí y lo borra siempre.
type Base = { branch: string; base: string; changedDeps: boolean }
function baseOf(root: string): Base {
  const branch = baseBranch(root)
  const ref = refExists(root, `origin/${branch}`) ? `origin/${branch}` : branch
  const base = git(root, 'merge-base', 'HEAD', ref)
  const changed = git(root, 'diff', '--name-only', base, 'HEAD').split('\n').filter(Boolean)
  return { branch, base, changedDeps: changed.some(file => LOCKFILES.test(file)) }
}

function inWorktree<T>(root: string, base: string, fn: (wt: string) => T): T {
  const wt = join(mkdtempSync(join(tmpdir(), 'seckert-base-')), 'base')
  try {
    git(root, 'worktree', 'add', '--quiet', '--detach', wt, base)
    if (existsSync(join(root, 'node_modules'))) symlinkSync(join(root, 'node_modules'), join(wt, 'node_modules'))
    return fn(wt)
  } finally {
    try {
      git(root, 'worktree', 'remove', '--force', wt)
    } catch {
      // ya no existía
    }
    rmSync(join(wt, '..'), { recursive: true, force: true })
  }
}

const sh = (cwd: string, command: string, env?: NodeJS.ProcessEnv) =>
  spawnSync('sh', ['-c', command], { cwd, timeout: TIMEOUT_MS, encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024 })
const couldNotRun = (ran: ReturnType<typeof sh>) => ran.error || ran.status === null || ran.status === 126 || ran.status === 127
const reason = (ran: ReturnType<typeof sh>) => ran.error?.message ?? `salida ${ran.status ?? 'cortada'}`
const firstLine = (error: unknown) => (error instanceof Error ? error.message.split('\n')[0] : String(error))

export function testsOnBase(root: string, input: { tests: string[]; runner: string }) {
  if (!input.tests.length) throw new Error('Pasá los tests que fallaron en la rama.')
  const { branch, base, changedDeps } = baseOf(root)
  const all = (veredicto: BaseResult['veredicto'], motivo: string) =>
    input.tests.map(test => ({ test, veredicto, motivo, comando: `${input.runner} ${test}` }))
  if (changedDeps) return { base: branch, resultados: all('FALLA', 'el change cambió dependencias, no pude comprobar la base') }

  try {
    const resultados = inWorktree(root, base, wt =>
      input.tests.map((test): BaseResult => {
        const comando = `${input.runner} ${test}`
        if (!existsSync(join(wt, test))) return { test, veredicto: 'FALLA', motivo: 'el test no existe en la base', comando }
        const ran = sh(wt, `${input.runner} ${shellQuote(test)}`, baseEnv())
        if (couldNotRun(ran)) return { test, veredicto: 'FALLA', motivo: `no se pudo correr en la base (${reason(ran)})`, comando }
        return ran.status === 0
          ? { test, veredicto: 'FALLA', motivo: 'pasa en la base: el fallo es del change', comando }
          : { test, veredicto: 'PREEXISTENTE', motivo: 'también falla en la base', comando }
      }),
    )
    return { base: branch, merge_base: base.slice(0, 7), resultados }
  } catch (error) {
    return { base: branch, resultados: all('FALLA', `no se pudo preparar la base (${firstLine(error)})`) }
  }
}

// checks_on_base: corre un lint o typecheck en la rama y en la base y separa
// los errores nuevos del change de los que ya estaban. Compara las líneas de
// salida sin colores ni números: editar un archivo corre las líneas y las
// columnas, y los tiempos cambian en cada corrida. Ante la duda, FALLA.
export type CheckResult = {
  comando: string
  veredicto: 'PASA' | 'PREEXISTENTE' | 'FALLA'
  motivo: string
  nuevos: string[]
  base?: string
  merge_base?: string
}

const MAX_NUEVOS = 30
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*[A-Za-z]`, 'g')

export function normalizeLine(line: string): string {
  return line.replace(ANSI, '').replace(/\d+/g, '#').replace(/\s+/g, ' ').trim()
}

// Las líneas de la rama que no están en la base, contando repeticiones: un
// segundo error igual al que ya estaba también es nuevo.
export function newLines(branch: string, base: string): string[] {
  const seen = new Map<string, number>()
  for (const line of base.split('\n').map(normalizeLine).filter(Boolean)) seen.set(line, (seen.get(line) ?? 0) + 1)
  const fresh: string[] = []
  for (const raw of branch.split('\n')) {
    const line = normalizeLine(raw)
    if (!line) continue
    const left = seen.get(line) ?? 0
    if (left > 0) seen.set(line, left - 1)
    else fresh.push(raw.replace(ANSI, '').trim())
  }
  return fresh
}

export function checksOnBase(root: string, input: { comando: string }): CheckResult {
  const comando = input.comando.trim()
  if (!comando) throw new Error('Pasá el comando de lint o typecheck del proyecto (p.ej. "bun run lint").')
  const result = (veredicto: CheckResult['veredicto'], motivo: string, nuevos: string[] = []): CheckResult => ({
    comando,
    veredicto,
    motivo,
    nuevos: nuevos.slice(0, MAX_NUEVOS),
  })

  const onBranch = sh(root, comando, baseEnv())
  if (couldNotRun(onBranch)) return result('FALLA', `no se pudo correr en la rama (${reason(onBranch)})`)
  if (onBranch.status === 0) return result('PASA', 'sin errores en la rama')
  const branchOut = `${onBranch.stdout}\n${onBranch.stderr}`

  let info: Base
  try {
    info = baseOf(root)
  } catch (error) {
    return result('FALLA', `no se pudo encontrar la base (${firstLine(error)})`, newLines(branchOut, ''))
  }
  const where = { base: info.branch, merge_base: info.base.slice(0, 7) }
  if (info.changedDeps)
    return { ...result('FALLA', 'el change cambió dependencias, no pude comprobar la base', newLines(branchOut, '')), ...where }

  try {
    return inWorktree(root, info.base, wt => {
      const onBase = sh(wt, comando, baseEnv())
      if (couldNotRun(onBase)) return { ...result('FALLA', `no se pudo correr en la base (${reason(onBase)})`, newLines(branchOut, '')), ...where }
      if (onBase.status === 0) return { ...result('FALLA', 'pasa en la base: los errores son del change', newLines(branchOut, '')), ...where }
      const nuevos = newLines(branchOut, `${onBase.stdout}\n${onBase.stderr}`)
      return nuevos.length
        ? { ...result('FALLA', `${nuevos.length} línea${nuevos.length > 1 ? 's' : ''} de error nueva${nuevos.length > 1 ? 's' : ''} respecto de la base`, nuevos), ...where }
        : { ...result('PREEXISTENTE', 'los mismos errores ya estaban en la base'), ...where }
    })
  } catch (error) {
    return { ...result('FALLA', `no se pudo preparar la base (${firstLine(error)})`, newLines(branchOut, '')), ...where }
  }
}
