---
status: done
specs: [verify, pr]
design: none
branch: feature/verify-converge
---

# Verificación que converge y PR que dirige la revisión

## Why

Hoy verify reabre tareas sin límite, culpa al change de fallos que ya estaban en la base y deja un PR que no le dice al humano dónde mirar. Cada ronda extra y cada revisión a ciegas gasta tiempo humano donde no hace falta. La idea viene de cómo el equipo de Claude Code revisa código: tope de rondas, hallazgos marcados como "pre-existing" y un PR con Testing, Riesgo y Cómo revertir.

## What

**Tope de rondas**
- Antes de verificar, verify lee en el Log las verificaciones anteriores del change.
- Si un mismo punto del What falla por **tercera vez**, verify no reabre sus tareas: dice que ya falló 3 veces, propone revisar el enfoque en una o dos líneas y lo deja en `## Preguntas abiertas` con su recomendación.
- Desde la segunda ronda, el verificador re-verifica **solo los puntos que fallaron** en la anterior, más la suite completa (que atrapa regresiones en los que ya pasaban).
- Cuando algo falla, el verificador nombra **el tipo de fallo** y todos los lugares donde aparece, no solo el caso que encontró (p.ej. "fechas sin zona horaria en los 3 endpoints de pedidos").

**Fallos que ya existían**
- Si la suite falla, el verificador corre esos tests en la base (`git merge-base HEAD <base>`), en un worktree temporal fuera del proyecto.
- Si también fallan en la base, el veredicto es `PREEXISTENTE`: verify no reabre tareas, lo anota en el Log y lo deja listado para el PR.
- El worktree no trae dependencias instaladas: el verificador enlaza (`ln -s`) el `node_modules` del proyecto dentro del worktree, sin instalar nada.
- Si el change tocó `package.json` o el lockfile, el enlace no representa la base: el veredicto queda `FALLA` con el motivo ("el change cambió dependencias, no pude comprobar la base").
- Si no puede correrlos en la base por cualquier otro motivo, lo dice y el veredicto queda `FALLA`: ante la duda, no se descarta un fallo.
- Al terminar borra el worktree.

**PR que dirige la revisión**
- El cuerpo del PR que abre seckert suma tres secciones a Why, What y Testing:
  - **Riesgo**: las tareas marcadas como sensibles (dinero, permisos, datos) y los archivos delicados que toca (migraciones, auth, pagos, workflows de CI, config de despliegue), en una línea de "revisá con cuidado: …". Si no hay nada sensible, lo dice: "Sin lógica sensible: presentación y lógica de bajo riesgo".
  - **Cómo revertir**: "revertir el merge" si es solo código; si hay migración, cómo deshacerla; si hay flag, cuál apagar.
  - **Evidencia**: la tabla de la última verificación y los fallos `PREEXISTENTE`, si los hay.

## Preguntas abiertas


## Tasks

- [x] T1 verify: leer las verificaciones previas del Log; al tercer fallo del mismo punto, pregunta abierta en vez de reabrir <!-- commit: 2368df7 -->
- [x] T2 verify + seckert-verifier: desde la segunda ronda, pasar al verificador los puntos que fallaron y re-verificar solo esos más la suite <!-- commit: 6b8afcb -->
- [x] T3 seckert-verifier: nombrar el tipo de fallo y todos los lugares donde aparece <!-- commit: 6b8afcb -->
- [x] T4 seckert-verifier: veredicto `PREEXISTENTE` corriendo los tests que fallan en un worktree de la base <!-- commit: 6b8afcb -->
- [x] T5 verify: `PREEXISTENTE` no reabre tareas; queda en el Log para el PR <!-- commit: 6b8afcb -->
- [x] T6 done: secciones Riesgo, Cómo revertir y Evidencia en el cuerpo del PR <!-- commit: 8c7947f -->
- [x] T7 evals: `verify-tercera-ronda` (un Log con dos fallos previos del mismo punto → pregunta abierta, sin reabrir) y `pr-riesgo` (change con tarea de dinero → el cuerpo del PR nombra el riesgo y cómo revertir) <!-- commit: fb33894 -->
- [x] T8 correr las evals afectadas y anotar los números en `evals/RESULTS.md` <!-- commit: 81af27f -->

## Testing

- Runner: `claude plugin test .` (módulo) y `claude plugin eval .` (comportamiento)
- Nivel: risk
- Lógica: el cambio es texto de skills y del agente; se cubre con las evals de T7, no con tests del módulo.
- Presentación: no aplica

## Log

- **L1** (pedido original, verbatim): exploremos la 1,2,5,
sobre la 6, generalmente no hay un review.md en los projectos
sobre herramientas de testing para desarrollo web, yo uso chrome devtools enlazado a chrome for testing, hay mas formas de que se haga un testing qa automatico, quiero capaz que el humano tenga menos sitios donde se le necesite y que su tiempo se vaya donde mas se necesita
- 2026-10-31: 1, 2 y 5 se refieren a las ideas sacadas del post "Solving code review at Anthropic" (https://claude.dev/blog/solving-code-review-at-anthropic/): tope de rondas, hallazgos pre-existing y plantilla de PR con Testing/Risk/How to revert. La 6 (`REVIEW.md`) se descarta: "generalmente no hay un review.md en los projectos". El QA automático va en su propio change (`2026-10-31-qa-devtools`).
- 2026-10-31: el usuario pidió escribirlo ("dale, escribilos ahora").
- 2026-10-31: tope de rondas confirmado en 3 fallos del mismo punto ("3 fallos esta ok").
- 2026-10-31: dependencias del worktree: se enlaza `node_modules` en vez de instalar, que tardaría minutos y necesitaría red en cada verificación. Si el change tocó `package.json` o el lockfile, `FALLA` con el motivo ("dale, aplica tu recomendacion que esta bien"). Sin preguntas abiertas.
- 2026-10-31: aprobado ("dale"). Rama `feature/verify-converge` creada desde `main` (fda0dd0). `qa-devtools` se aprueba cuando termine este.
- 2026-10-31: T1 hecha (2368df7). verify registra cada verificación como `- <fecha> verify: …` con los puntos que fallan nombrados como en el What, y al tercer fallo del mismo punto lo lleva a Preguntas abiertas en vez de reabrir tareas. `claude plugin test .`: 13 pass, 0 fail. La conducta se comprueba con la eval `verify-tercera-ronda` (T7).
- 2026-10-31: T2–T5 hechas (6b8afcb). Desde la segunda ronda, verify le pasa al verificador los puntos que fallaron. El verificador nombra el tipo de fallo y dónde aparece, y decide `PREEXISTENTE` corriendo los tests en un worktree de la base con `node_modules` enlazado. Si el change tocó dependencias, o si el test no existe en la base, queda `FALLA`. Los comandos del worktree se probaron en un repo descartable: se crea, se enlaza y se borra sin tocar el `node_modules` real. `claude plugin test .`: 13 pass, 0 fail.
- 2026-10-31: T6 hecha (8c7947f). El PR que abre `done` suma `## Riesgo`, `## Cómo revertir` y `## Evidencia`.
- 2026-10-31: T7 hecha (fb33894). Evals `verify-tercera-ronda` (Log con dos fallos previos del mismo punto y el bug todavía en `src/precio.ts`) y `pr-riesgo` (cupones terminados y verificados, con remoto local para el push). Scaffolds probados a mano: el primero deja 1 test fallando en `feature/descuento`; el segundo, la suite en verde.
- 2026-10-31: T8 hecha (81af27f). Evals con 3 corridas por brazo: `verify-tercera-ronda` 3/3 con seckert y 0/3 sin seckert; `pr-riesgo` 3/3 y 0/3. La primera corrida de `pr-riesgo` dio 0/3 con seckert por un chequeo que pedía el cuerpo después de `gh pr create`; las trazas sí tenían Riesgo, Cómo revertir y Evidencia, así que se corrigió el chequeo para aceptar los dos órdenes y se volvió a correr. Costo total: $3,32. Specs escritas en `sdd/specs/verify.md` y `sdd/specs/pr.md`.
- 2026-10-31 verify: PASA "Si un mismo punto del What falla por tercera vez…" (eval `verify-tercera-ronda`, 1 corrida: con seckert 1,00, sin seckert 0,50); PASA el worktree con `node_modules` enlazado, que se borra sin tocar el real (repo descartable); PASA "El cuerpo del PR que abre seckert suma tres secciones…" (eval `pr-riesgo`, 1 corrida: con seckert 1,00, sin seckert 0,00). NO VERIFICABLE, sin eval que lo ejecute: re-verificar solo lo que falló desde la segunda ronda, nombrar el tipo de fallo, `PREEXISTENTE` en una verificación real, `FALLA` cuando el change tocó dependencias y `FALLA` cuando no se puede correr en la base. Comandos: `claude plugin test .` (13 pass, 0 fail), `claude plugin eval . --case verify-tercera-ronda --scaffold --runs 1`, `claude plugin eval . --case pr-riesgo --scaffold --runs 1`.
- 2026-10-31: evals nuevas para dos puntos que la verificación dejó como NO VERIFICABLE (677be39). En las dos, 3/3 con seckert y 0/3 sin seckert (3 corridas por brazo, $2,03). `verify-segunda-ronda`: al verificador le llega solo "El envío express cuesta $15…" y no el punto que ya había pasado. `verify-preexistente`: el verificador corre en un worktree de la base el test que ya fallaba en `main`, borra el worktree, anota `PREEXISTENTE` en la línea `verify:` y no reabre tareas. Siguen sin eval: nombrar el tipo de fallo, `FALLA` cuando el change tocó dependencias y `FALLA` cuando no se puede correr en la base.
- 2026-10-31: cerrado ("dale, cerralo y abrí el PR"). Specs en `sdd/specs/verify.md` y `sdd/specs/pr.md`.
