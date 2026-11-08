# Evals

Pedidos reales sobre un repo de prueba, corridos con seckert, para comprobar que Claude sigue el flujo y medir cuánto cuesta. Los resultados por versión están en [RESULTS.md](RESULTS.md).

No afectan a quien usa el plugin: Claude Code solo carga `skills/`, `agents/` y `hooks/`. Esta carpeta se instala con el plugin pero nunca se lee ni se ejecuta en sus sesiones.

## Correr

```sh
bun run build:mcp
claude plugin eval . --runs 3 --ablation none -j 8 \
  --scaffold --mocks off --allow-tools Bash Edit Write 'mcp__plugin_seckert_seckert__*' --no-publish \
  --keep-temp --max-cost-usd 20 --json evals/results/<version>.json

bun evals/metrics.ts evals/results/<version>.json   # palabras, tokens, segundos y costo
```

- `--mocks off` arranca el servidor MCP real del plugin (`mcp/dist/server.mjs`), fuera del sandbox de las herramientas de shell: compílalo antes.
- Una corrida completa son 39 sesiones (13 casos × 3 corridas, solo con seckert): unos $7.
- La comparación con Claude sin seckert (`--ablation with-without`) dobla el costo y casi no cambia entre versiones, porque no depende de nuestro código. Ya está medida en `RESULTS.md` (0.8.0: 51/51 con seckert, 21/51 sin seckert). Se repite solo en una release mayor o al agregar un caso nuevo, para saber si seckert aporta.
- Solo hay casos para reglas que Claude no cumple sin seckert, o que seckert podría romper (`fix-texto-boton`: lo chico se hace directo). Después de 0.8.1 se quitaron los 5 que también pasaban siempre sin seckert: `hotfix-gitflow`, `iterar-propuesta`, `pantalla-nueva-fix`, `solo-lectura` y `spec-envio-gratis`. `iterar-propuesta` volvió en 0.9.0: ahora exige `change_update`, que Claude sin seckert no tiene. Antes de agregar uno, preguntarse si Claude ya lo hace solo.
- Usamos 3 corridas y no 5 porque 5 se come casi todo el límite de uso de 5 horas. Si igual se corta, las corridas cortadas dan error de API y hay que repetir esos casos con `--case`. Para probar un ajuste alcanza con los casos afectados.
- Los casos de issues (`--tag issues`) usan un `gh` falso que guarda issues y PRs en `.gh.json`. Hay que correrlos con `PATH="$PWD/evals/_fixture/bin:$PATH"` delante de `claude plugin eval`, para que el servidor MCP lo encuentre. El Bash de Claude no hereda ese PATH: su `gh pr create` llama al `gh` real y falla sin sesión, por eso esos graders miran el comando y no el PR creado.
- Correrla antes de subir la versión en `plugin.json`, y anotar los números en `RESULTS.md`.
- Un solo caso: `--case <nombre>`. Varios: `--tag <tag>` (`--case` repetido corre solo uno).
- `--keep-temp` conserva las trazas, que son las que usa `metrics.ts`. Las copia a `evals/results/<version>-traces/`, donde se pueden leer las respuestas de cada corrida.
- `evals/results/` no se sube al repo.

## Qué se mide

| Caso | Regla de seckert |
|---|---|
| `fix-texto-boton` | Un cambio chico se hace directo: sin propuesta ni anunciar la ruta |
| `change-cupones` | Lógica nueva de dinero: propuesta en `proposed` y nada de código |
| `change-grande-partes` | Un pedido con partes que sirven solas se parte en varios changes en orden; el layout queda como FIX; la parte de datos lleva un `erDiagram` |
| `iterar-propuesta` | Los ajustes van al mismo change con `change_update` (quitar una tarea, sumar un punto), que sigue en `proposed` |
| `aprobar-con-dale` | "dale" aprueba el change, lo anota en el Log y crea `feature/<slug>` |
| `bug-test-primero` | Con `seckert tests: strict`, el test se escribe antes del fix |
| `fix-commit-gitflow` | Con `develop`, el commit va en `fix/…`, no en la rama protegida |
| `verify-tercera-ronda` | Al tercer fallo del mismo punto, verify lo deja en Preguntas abiertas en vez de reabrir la tarea |
| `verify-segunda-ronda` | Desde la segunda ronda, al verificador se le pasa solo el punto que falló |
| `verify-preexistente` | Un test que ya fallaba en `main` se comprueba en la base, queda `PREEXISTENTE` y no reabre tareas |
| `devtools-ausente` | Sin Chrome DevTools MCP, verify lo ofrece en una línea, no instala nada sin permiso y sigue verificando |
| `qa-sin-navegador` | Con `SECKERT_QA=sin-navegador` en `.claude/settings.local.json`, no lo ofrece |
| `pr-riesgo` | El PR de un change con lógica de dinero trae Risk, How to revert y Evidence |
| `tomar-issue-fix` | Un issue aprobado de ruta FIX se toma con `issue_take` (rama `fix/` enlazada), se hace directo y su PR empieza con `Fixes #1` y completa How to revert |
| `tomar-issue-change` | Un issue aprobado de ruta CHANGE se toma en `feature/<slug>` y se convierte en una propuesta con `issue: #1` y el mismo slug, sin tocar código |

En los casos con propuesta, `sin-comandos` chequea que el siguiente paso se ofrezca en palabras, sin `/seckert:…`.

Además de pasar o no, `metrics.ts` mide la eficiencia de cada caso: palabras de la respuesta final, tokens de salida, contexto leído, segundos y costo.

## Agregar un caso

```
evals/<caso>/
├── prompt.md       frontmatter (tags, max_turns, allowed_tools) + el pedido, tal cual lo diría el usuario
├── case.yaml       schema_version "1.1", name y scaffold_script: scaffold.sh
├── scaffold.sh     arma el repo: llama a ../_fixture/setup.sh [overlay] y agrega ramas si hace falta
├── overlay/        opcional: archivos que se copian encima de la tienda (un change, un AGENTS.md)
└── graders/*.md    un chequeo por archivo
```

Chequeos que usamos:

- `regex` sobre la respuesta (`target` por defecto), sobre un archivo (`target: {source: file, path: …}`) o sobre los archivos creados (`target: files`). Las regex son de JS: para ignorar mayúsculas usá `flags: i`, no `(?i)`.
- `tool_used` con `input_match` y `min`/`max`: "no editó nada en `src/`", "corrió `git switch -c fix/…`".
- `file_exists` con un glob: solo ve archivos **creados**, no modificados.
- `llm`: un juez (haiku) vota 3 veces. Es más ruidoso que los demás; usarlo solo para lo que no se puede chequear con archivos o herramientas.

Antes de sumar un caso a la corrida completa, probalo solo una vez sin baseline: `--case <nombre> --runs 1 --ablation none`.

El repo de prueba es `_fixture/tienda`: precio con descuento (con un bug), envío gratis desde $50, un checkout y la spec `sdd/specs/pedidos.md`.
