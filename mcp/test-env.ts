// El env para arrancar el servidor en un spec: el de quien corre los tests, sin
// CLAUDE_PROJECT_DIR. Con esa variable, projectRoot() apunta al proyecto real y
// el gh falso hace `git switch -c` ahí en vez de en el repo temporal del spec.
export function serverEnv(extra: Record<string, string> = {}): Record<string, string> {
  const { CLAUDE_PROJECT_DIR: _project, ...env } = process.env as Record<string, string>
  return { ...env, ...extra }
}
