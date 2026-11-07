# Resultados de los evals

Cómo se corren y qué mide cada caso: [README.md](README.md). Cada celda es **con seckert / sin seckert**: el mismo modelo, los mismos pedidos y el mismo repo de prueba, con el plugin y sin él.

## 0.9.0 · corrida completa · 2026-11-06

Changes `redaccion-y-diagramas` y `sdd-por-mcp`: redacción controlada, diagramas en la propuesta, `change_update` y `spec_write` como camino preferido para escribir `sdd/`, y arreglos del lector de changes. Primera corrida completa solo con seckert (`--ablation none`): 13 casos × 3 corridas, 39 sesiones. Modelo `claude-opus-5-5`. Costo: $8,07, con la repetición de `aprobar-con-dale`.

Flujo: **38/39 con seckert.**

| Caso | Con seckert | Palabras | Palabras por frase | Tokens de salida | Segundos | Costo | Costo 0.8.0 |
|---|---|---|---|---|---|---|---|
| `aprobar-con-dale` | 3/3 | 129 | 7,4 | 3.251 | 38 | $0,26 | $0,23 |
| `bug-test-primero` | 3/3 | 68 | 8,2 | 1.180 | 17 | $0,14 | $0,14 |
| `change-cupones` | 3/3 | 146 | 8,7 | 2.184 | 27 | $0,19 | $0,19 |
| `change-grande-partes` | 3/3 | 221 | 7,8 | 4.269 | 47 | $0,26 | $0,26 |
| `devtools-ausente` | 3/3 | 150 | 9,4 | 1.385 | 31 | $0,21 | $0,20 |
| `fix-commit-gitflow` | 3/3 | 41 | 7,2 | 863 | 15 | $0,13 | $0,14 |
| `fix-texto-boton` | 3/3 | 31 | 8,6 | 507 | 8 | $0,11 | $0,12 |
| `iterar-propuesta` | 3/3 | 59 | 6,9 | 781 | 10 | $0,13 | $0,13 |
| `pr-riesgo` | 2/3 | 151 | 9,5 | 2.223 | 32 | $0,22 | $0,21 |
| `qa-sin-navegador` | 3/3 | 127 | 9,6 | 1.077 | 29 | $0,19 | $0,19 |
| `verify-preexistente` | 3/3 | 111 | 9,4 | 929 | 28 | $0,18 | $0,18 |
| `verify-segunda-ronda` | 3/3 | 129 | 7,8 | 1.266 | 25 | $0,20 | $0,18 |
| `verify-tercera-ronda` | 3/3 | 173 | 10,4 | 1.387 | 35 | $0,21 | $0,21 |

Notas:
- Costo por pedido con seckert: $0,186 contra $0,183 de 0.8.0 en los mismos 13 casos (+2%).
- `aprobar-con-dale` dio 0/3 en la corrida completa por el grader, no por el plugin: buscaba en la traza la línea "Rama feature/… desde", que solo aparecía si Claude releía el change. Con las herramientas ya no lo relee. El grader pasó a mirar el archivo del change, y al repetirlo dio 3/3; la tabla es esa repetición.
- `pr-riesgo` 2/3: en la corrida que falla, Claude frenó antes de abrir el PR porque el checkout del repo de prueba no usa el cupón. Es criterio, no un fallo del flujo; las otras dos abren el PR con Risk, How to revert y Evidence.
- Las secciones "0.9.0 (sin publicar)" de abajo son las corridas parciales de cada change.

## 0.9.0 (sin publicar) · edición de sdd/ por MCP · 2026-11-06

Change `sdd-por-mcp`: `change_update` y `spec_write` como camino preferido para escribir `sdd/`, sin bloqueos nuevos (el hook solo sigue rechazando cambiar el status o marcar tareas con Edit o Write). Los casos que escriben changes, con seckert y sin brazo sin seckert, 3 corridas cada uno. Costo: $2,15, más $1,34 de `iterar-propuesta` (tres corridas).

| Caso | Con seckert | Palabras | Palabras por frase | Tokens de salida | Segundos | Costo | Costo 0.8.0 |
|---|---|---|---|---|---|---|---|
| `change-grande-partes` | 3/3 | 206 | 7,4 | 4.476 | 52 | $0,26 | $0,26 |
| `aprobar-con-dale` | 3/3 | 129 | 10,0 | 2.910 | 36 | $0,24 | $0,23 |
| `verify-tercera-ronda` | 3/3 | 177 | 9,2 | 1.412 | 37 | $0,22 | $0,21 |
| `iterar-propuesta` | 3/3 | 52 | 8,0 | 737 | 9 | $0,13 | $0,13 |

Notas:
- Costo por pedido +3% frente a 0.8.0 en estos 3 casos ($0,239 contra $0,233), dentro del tope de 10% que fijó la P3 del change.
- `iterar-propuesta` volvió, con un grader que exige `change_update` con `task_remove`. En la primera corrida pasó 3/3 pero costó $0,18 (+38%): Claude intentaba Edit, el hook lo rechazaba 2 o 3 veces y recién ahí buscaba `change_update`. Con una línea en el contexto de sesión que nombra `change_update` y `spec_write`, va directo a `change_update` y cuesta $0,13. La tabla es la tercera corrida, ya sin bloqueos.
- `spec_write` queda cubierto por los tests de `mcp/update.spec.ts`, no por evals.

## 0.9.0 (sin publicar) · redacción y diagramas · 2026-11-06

Change `redaccion-y-diagramas`: reglas de redacción controlada (STE liviano) y el parámetro `diagram` de `change_create`. Solo los 2 casos que tocan la propuesta, con seckert y sin brazo sin seckert (`--ablation none`), 3 corridas cada uno. Costo: $1,36.

| Caso | Con seckert | Palabras | Palabras por frase | Tokens de salida | Segundos | Costo |
|---|---|---|---|---|---|---|
| `change-cupones` | 3/3 | 157 | 9,4 | 2.133 | 30 | $0,19 |
| `change-grande-partes` | 3/3 | 218 | 7,7 | 4.642 | 51 | $0,26 |

Notas:
- `change-grande-partes` lleva el `erDiagram` de las cuentas en las 3 corridas.
- El grader de diagrama empezó en `change-cupones` y falló 3/3, pero el error era del grader. El repo de prueba no tiene base de datos y aplicar un cupón es un solo paso: no corresponde diagrama, y Claude no lo agregó. El grader pasó a `change-grande-partes`.
- Palabras por frase es una métrica nueva, solo informativa: la guía es ~20 y las dos respuestas quedan muy por debajo. Cuenta como frase cada línea de lista, así que el número es bajo.
- Costo por pedido igual que en 0.8.0 ($0,19 y $0,26): las reglas nuevas no suman tokens que se noten.

## 0.8.0 · corrida completa · 2026-11-05

Partes 2 y 3 del MCP: `tests_on_base`, `pr_draft` y `release_draft`; control de Bash sobre los changes; `## Open questions`; skills recortadas y en inglés (`workflow` de 1.577 a 777 palabras; −21% de tokens por el idioma, medido en esa skill), con la regla de responder en el idioma del usuario.

Modelo `claude-opus-5-5`, Claude Code 2.1.318, 3 corridas por caso y brazo, con `--mocks off` y las herramientas del MCP permitidas. La primera corrida completa se cortó por el límite de 5 horas (74 sesiones con error de API); los 13 casos cortados se repitieron con `--case`. `devtools-ausente` dio 2/3 (no ofrecía el navegador): se hizo explícita la oferta en `verify` y se repitieron ese caso y `qa-sin-navegador`. Costo total ≈ $20.

Flujo en los 17 casos: **51/51 con seckert, 21/51 sin seckert**. Las respuestas siguen en castellano.

| | 0.6.0 | 0.7.0 | 0.8.0 |
|---|---|---|---|
| Costo por pedido con seckert / sin seckert, 17 casos | $0,172 / $0,149 (+15%) | — | $0,172 / $0,151 (+14%) |
| Costo por pedido con seckert, los 7 casos de 0.7.0 | $0,189 | $0,200 | $0,190 |

| Caso | Con seckert | Sin seckert | Costo |
|---|---|---|---|
| `aprobar-con-dale` | 3/3 | 0/3 | $0,23 / $0,22 |
| `bug-test-primero` | 3/3 | 2/3 | $0,14 / $0,14 |
| `change-cupones` | 3/3 | 0/3 | $0,19 / $0,18 |
| `change-grande-partes` | 3/3 | 0/3 | $0,26 / $0,23 |
| `devtools-ausente` | 3/3 | 0/3 | $0,20 / $0,14 |
| `fix-commit-gitflow` | 3/3 | 1/3 | $0,14 / $0,12 |
| `fix-texto-boton` | 3/3 | 3/3 | $0,12 / $0,10 |
| `hotfix-gitflow` | 3/3 | 3/3 | $0,16 / $0,15 |
| `iterar-propuesta` | 3/3 | 3/3 | $0,13 / $0,14 |
| `pantalla-nueva-fix` | 3/3 | 3/3 | $0,12 / $0,11 |
| `pr-riesgo` | 3/3 | 0/3 | $0,21 / $0,18 |
| `qa-sin-navegador` | 3/3 | 0/3 | $0,19 / $0,15 |
| `solo-lectura` | 3/3 | 3/3 | $0,13 / $0,11 |
| `spec-envio-gratis` | 3/3 | 3/3 | $0,14 / $0,13 |
| `verify-preexistente` | 3/3 | 0/3 | $0,18 / $0,14 |
| `verify-segunda-ronda` | 3/3 | 0/3 | $0,18 / $0,16 |
| `verify-tercera-ronda` | 3/3 | 0/3 | $0,21 / $0,17 |

Notas:
- El costo con seckert vuelve al de 0.6.0 ($0,172) con seis herramientas más y las reglas aplicadas en código; en los 7 casos que tocó 0.7.0 baja de $0,200 a $0,190 (−5%). Recortar y traducir las skills compensó lo que había sumado el MCP, pero no bajó del punto de partida.
- La sobrecarga de seckert está sobre todo en los casos de verify y QA (+$0,04 a $0,06), donde corre el verificador.

## 0.7.0 · MCP de seckert · 2026-11-05

Change `mcp-changes`: los changes se leen y escriben con herramientas de un servidor MCP del plugin (`change_get`, `change_create`, `change_transition`, `task_complete`, `verify_record`) y el módulo rechaza cambiar el status o marcar tareas a mano. Solo los 7 casos que tocan esas skills.

Modelo `claude-opus-5-5`, Claude Code 2.1.318, 3 corridas por caso y brazo (42 sesiones), con `--mocks off` y las herramientas del MCP permitidas. Costo: $7,83, más $1,23 de una corrida de `change-cupones` que se repitió: el grader `propuesta-en-proposed` no reconocía las comillas escapadas del resultado de `change_create` en la traza, aunque las 3 propuestas habían nacido en `proposed`.

Flujo en los 7 casos: **21/21 con seckert, 3/21 sin seckert**. En 0.6.0 (5 corridas) eran 34/35 y 5/35; el único fallo, `verify-segunda-ronda`, ahora es 3/3.

| | 0.6.0 | 0.7.0 |
|---|---|---|
| Costo por pedido con seckert / sin seckert, mismos 7 casos | $0,189 / $0,167 (+13%) | $0,200 / $0,170 (+18%) |

| Caso | Con seckert | Sin seckert | Palabras | Tokens de salida | Contexto leído | Segundos | Costo |
|---|---|---|---|---|---|---|---|
| `aprobar-con-dale` | 3/3 | 0/3 | 147 / 234 | 3.181 / 4.134 | 229.917 / 169.489 | 39 / 47 | $0,25 / $0,24 |
| `change-cupones` | 3/3 | 0/3 | 198 / 281 | 2.506 / 3.583 | 128.564 / 88.103 | 30 / 37 | $0,20 / $0,19 |
| `iterar-propuesta` | 3/3 | 3/3 | 75 / 107 | 1.235 / 1.282 | 71.995 / 79.151 | 14 / 16 | $0,14 / $0,13 |
| `pr-riesgo` | 3/3 | 0/3 | 161 / 260 | 2.201 / 2.098 | 199.164 / 128.643 | 32 / 31 | $0,21 / $0,17 |
| `verify-preexistente` | 3/3 | 0/3 | 113 / 264 | 927 / 1.417 | 124.137 / 75.843 | 35 / 26 | $0,20 / $0,14 |
| `verify-segunda-ronda` | 3/3 | 0/3 | 134 / 262 | 1.295 / 1.946 | 132.342 / 111.217 | 28 / 25 | $0,19 / $0,16 |
| `verify-tercera-ronda` | 3/3 | 0/3 | 177 / 223 | 1.427 / 1.930 | 148.188 / 102.473 | 39 / 34 | $0,21 / $0,16 |

Notas:
- Confiabilidad: la línea `verify:` ya no depende de cómo la escriba el modelo; el formato y el conteo de rondas los pone `verify_record`.
- Costo: no bajó. Con seckert sube de $0,189 a $0,200 por pedido (+6%). Las skills no se achicaron (T8 cambió explicaciones de formato por nombres de herramientas, casi las mismas líneas) y cada llamada a una herramienta diferida suma una búsqueda de su esquema. Bajar el costo queda para otro cambio.
- Dos graders se ajustaron para medir el resultado y no la forma: `rama-feature` acepta la rama creada por `change_transition` y `propuesta-en-proposed`, la propuesta creada por `change_create`.

## 0.6.0 · corrida completa · 2026-11-01

Modelo `claude-opus-5-5`, Claude Code 2.1.316, 5 corridas por caso y brazo (170 sesiones). Costo: $28,51. La primera corrida se cortó por el límite de 5 horas en los tres casos de verify (29 sesiones con error de API); esos tres se repitieron con `--case` ($5,20) y sus números reemplazan a los cortados.

Flujo en los 17 casos: **84/85 con seckert, 37/85 sin seckert**. En los 11 casos de 0.5.0, igual que entonces: 55/55 y 32/55.

| | 0.5.0 | 0.6.0 |
|---|---|---|
| Costo por pedido con seckert / sin seckert, mismos 11 casos | $0,161 / $0,149 (+8%) | $0,162 / $0,145 (+12%) |
| Palabras por respuesta con seckert / sin seckert, mismos 11 casos | — | 106 / 158 |
| Costo por pedido con seckert / sin seckert, los 17 casos | — | $0,172 / $0,149 (+15%) |

| Caso | Con seckert | Sin seckert | Palabras | Tokens de salida | Contexto leído | Segundos | Costo |
|---|---|---|---|---|---|---|---|
| `aprobar-con-dale` | 5/5 | 0/5 | 168 / 258 | 3.471 / 2.431 | 215.820 / 99.846 | 43 / 30 | $0,24 / $0,17 |
| `bug-test-primero` | 5/5 | 1/5 | 65 / 98 | 1.219 / 1.294 | 98.787 / 129.882 | 15 / 18 | $0,14 / $0,14 |
| `change-cupones` | 5/5 | 0/5 | 162 / 298 | 2.455 / 3.702 | 109.839 / 111.693 | 31 / 38 | $0,19 / $0,20 |
| `change-grande-partes` | 5/5 | 1/5 | 236 / 387 | 4.896 / 4.935 | 108.723 / 87.697 | 54 / 59 | $0,26 / $0,23 |
| `devtools-ausente` | 5/5 | 0/5 | 166 / 252 | 1.397 / 2.006 | 117.721 / 96.068 | 31 / 30 | $0,21 / $0,16 |
| `fix-commit-gitflow` | 5/5 | 0/5 | 49 / 66 | 939 / 824 | 112.707 / 88.359 | 16 / 14 | $0,14 / $0,12 |
| `fix-texto-boton` | 5/5 | 5/5 | 38 / 45 | 503 / 550 | 87.454 / 76.730 | 9 / 9 | $0,11 / $0,10 |
| `hotfix-gitflow` | 5/5 | 5/5 | 145 / 145 | 1.796 / 1.731 | 132.505 / 121.409 | 28 / 24 | $0,17 / $0,15 |
| `iterar-propuesta` | 5/5 | 5/5 | 90 / 115 | 1.451 / 1.345 | 102.305 / 88.537 | 18 / 16 | $0,15 / $0,14 |
| `pantalla-nueva-fix` | 5/5 | 5/5 | 58 / 70 | 644 / 682 | 80.850 / 77.657 | 11 / 11 | $0,12 / $0,11 |
| `pr-riesgo` | 5/5 | 0/5 | 172 / 225 | 1.949 / 2.357 | 137.703 / 131.650 | 31 / 37 | $0,18 / $0,18 |
| `qa-sin-navegador` | 5/5 | 0/5 | 170 / 256 | 1.274 / 1.281 | 113.523 / 75.006 | 34 / 21 | $0,20 / $0,13 |
| `solo-lectura` | 5/5 | 5/5 | 107 / 178 | 916 / 940 | 80.597 / 63.485 | 11 / 12 | $0,12 / $0,11 |
| `spec-envio-gratis` | 5/5 | 5/5 | 49 / 81 | 1.120 / 1.128 | 99.220 / 83.044 | 13 / 13 | $0,14 / $0,12 |
| `verify-preexistente` | 5/5 | 0/5 | 143 / 262 | 963 / 1.527 | 99.303 / 86.590 | 33 / 26 | $0,18 / $0,15 |
| `verify-segunda-ronda` | 4/5 | 0/5 | 123 / 270 | 1.076 / 2.315 | 104.726 / 109.799 | 23 / 29 | $0,17 / $0,17 |
| `verify-tercera-ronda` | 5/5 | 0/5 | 210 / 215 | 1.890 / 1.839 | 118.834 / 100.350 | 40 / 32 | $0,21 / $0,16 |

Notas:
- El costo con seckert en los 11 casos de 0.5.0 no cambió ($0,161 → $0,162). La diferencia sube de +8% a +12% porque sin seckert salió algo más barato en esta corrida.
- El fallo con seckert de `verify-segunda-ronda` es de formato: la verificación salió bien y al verificador le pasó solo el punto que falló, pero en el Log escribió `verify (2ª ronda):` en vez de `verify:`. El tope de rondas cuenta las líneas `verify:`, así que esa ronda podría no contarse.
- `aprobar-con-dale` sin seckert baja de 2/5 a 0/5, y `bug-test-primero` y `change-grande-partes` sin seckert suben de 0/5 a 1/5: es ruido del brazo sin seckert con 5 corridas.

## 0.6.0 · 2026-10-31

Sin corrida completa: solo los 6 casos nuevos, con 3 corridas por caso y brazo. Los 11 casos de 0.5.0 no se volvieron a correr con estos cambios.

### Verificación en el navegador (`qa-devtools`)

Modelo `claude-opus-5-5`, Claude Code 2.1.316, 3 corridas por caso y brazo, solo los 2 casos nuevos. Costo: $5,14, con las corridas repetidas tras mover el "sin navegador" a local (una se cortó por el límite de uso y no cuenta).

Cambios:
- verify y design verifican en el navegador con Chrome DevTools MCP, con chequeos fijos: el What recorrido, consola, red, 3 anchos, estados y Lighthouse de accesibilidad. El resultado va en texto. Si el MCP no está, lo ofrecen en una línea: con Google Chrome si está, si no con Chrome for Testing en `~/.cache/seckert/chrome-for-testing`, siempre con `--scope local`. Si el usuario dice que no, la preferencia se guarda en local (`env.SECKERT_QA` en `.claude/settings.local.json`) y no lo vuelven a ofrecer.
- Sección QA en el esqueleto del `AGENTS.md` y ruta de Expo en el simulador.

| Caso | Con seckert | Sin seckert | Palabras | Tokens de salida | Contexto leído | Segundos | Costo |
|---|---|---|---|---|---|---|---|
| `devtools-ausente` | 3/3 | 0/3 | 174 / 249 | 1.327 / 1.525 | 102.482 / 88.059 | 28 / 23 | $0,21 / $0,14 |
| `qa-sin-navegador` | 3/3 | 0/3 | 147 / 256 | 1.128 / 1.606 | 107.930 / 81.424 | 27 / 22 | $0,20 / $0,14 |

- Sin seckert, Claude no ofrece el navegador ni deja la verificación en el Log; da el texto del botón por bueno leyendo el código.
- Con seckert, lo que solo se ve en la app queda `NO VERIFICABLE (sin navegador)` en vez de darse por bueno leyendo el código, y la oferta sale en una línea al final.
- Con seckert cuestan entre $0,06 y $0,07 más por corrida: leen `navegador.md` y corren el verificador.
- En el sandbox de las evals, el `env` de `settings.local.json` no llega a la sesión (`$SECKERT_QA` vacío) y con seckert se volvía a ofrecer DevTools (0/3). Por eso el contexto de inicio y `navegador.md` también leen la preferencia del archivo.
- Las evals no tienen navegador: miden la oferta y el "sin navegador", no los chequeos dentro del navegador.

### Verificación que converge y PR que dirige la revisión (`verify-converge`)

Modelo `claude-opus-5-5`, Claude Code 2.1.316, 3 corridas por caso y brazo, solo los 4 casos nuevos. Costo: $5,35 (incluye una corrida de `pr-riesgo` descartada por un chequeo mal escrito).

Cambios:
- verify registra cada verificación como una línea `verify:` en el Log. Al tercer fallo del mismo punto, lo deja en Preguntas abiertas en vez de reabrir. Desde la segunda ronda re-verifica solo lo que falló, más la suite. El verificador nombra el tipo de fallo y marca `PREEXISTENTE` los tests que ya fallaban en la base. Casos nuevos: `verify-tercera-ronda`, `verify-segunda-ronda` y `verify-preexistente`.
- El PR que abre seckert suma `## Riesgo`, `## Cómo revertir` y `## Evidencia`. Caso nuevo: `pr-riesgo`.

| Caso | Con seckert | Sin seckert | Palabras | Tokens de salida | Contexto leído | Segundos | Costo |
|---|---|---|---|---|---|---|---|
| `verify-tercera-ronda` | 3/3 | 0/3 | 228 / 219 | 1.907 / 1.888 | 123.753 / 102.093 | 44 / 34 | $0,22 / $0,16 |
| `verify-segunda-ronda` | 3/3 | 0/3 | 146 / 275 | 1.218 / 2.319 | 107.977 / 112.255 | 29 / 28 | $0,18 / $0,17 |
| `verify-preexistente` | 3/3 | 0/3 | 141 / 276 | 985 / 1.452 | 99.933 / 75.550 | 36 / 26 | $0,18 / $0,14 |
| `pr-riesgo` | 3/3 | 0/3 | 170 / 229 | 2.271 / 1.977 | 170.029 / 120.157 | 40 / 32 | $0,20 / $0,16 |

- Sin seckert, Claude reabre la tarea por tercera vez y nunca propone cambiar el enfoque. Cuando un test ya fallaba en `main`, se da cuenta de que no es del change, pero no lo comprueba en la base ni lo deja marcado. En la segunda ronda vuelve a verificar todo.
- Con seckert, en la segunda ronda el verificador recibe solo el punto que falló, y el test roto en `main` se comprueba en un worktree de la base y queda `PREEXISTENTE` en el Log. En `pr-riesgo`, sin seckert, no cierra el change y el PR no trae Riesgo, Cómo revertir ni Evidencia.
- Con seckert, estos casos cuestan entre $0,01 y $0,06 más por corrida: leen más contexto (el skill y el agente verificador). Las respuestas salen cerca de la mitad de largas.
- `pr-riesgo` usa un remoto local: `gh pr create` falla siempre por falta de GitHub. Se califica el comando con el que intenta abrirlo.
- La primera corrida de `pr-riesgo` dio 0/3 con seckert por el chequeo. Pedía el cuerpo *después* de `gh pr create`, y seckert lo escribe antes en un archivo, dentro del mismo comando. Las trazas mostraban las tres secciones; ahora el chequeo acepta los dos órdenes.

## 0.5.0 · 2026-10-31

Modelo `claude-opus-5-5`, Claude Code 2.1.316, 5 corridas por caso y brazo (110 sesiones). Costo: $17,05.

Cambios respecto de 0.4.0:
- `seckert:change` parte un pedido grande (más de ~8 tareas, o partes que sirven solas) en varios changes en orden: solo el primero se escribe completo, cada uno dice `Parte N de M: después de …`, y lo que es solo presentación queda como FIX. Caso nuevo: `change-grande-partes`.
- El siguiente paso se ofrece en lenguaje natural ("¿lo verifico?", "si está bien, lo cierro y abro el PR"), nunca como `/seckert:verify` o `/seckert:done`. Chequeo nuevo `sin-comandos` en los 4 casos con propuesta. Suma una línea al texto de inicio (≈+70 tokens, estimado por tamaño).

| | 0.4.0 | 0.5.0 |
|---|---|---|
| Flujo con seckert / sin seckert | 50/50 · 34/50 | 55/55 · 32/55 |
| Costo por pedido con seckert / sin seckert, mismos 10 casos | $0,145 / $0,135 (+7%) | $0,150 / $0,142 (**+6%**) |
| Costo por pedido con seckert / sin seckert, los 11 casos | — | $0,161 / $0,149 (+8%) |
| Palabras por respuesta con seckert / sin seckert, mismos 10 casos | 88 / 128 | 92 / 135 |

| Caso | Con seckert | Sin seckert | Palabras | Tokens de salida | Contexto leído | Segundos | Costo |
|---|---|---|---|---|---|---|---|
| `aprobar-con-dale` | 5/5 | 2/5 | 167 / 251 | 3.253 / 3.936 | 190.145 / 160.459 | 41 / 43 | $0,23 / $0,23 |
| `bug-test-primero` | 5/5 | 0/5 | 68 / 97 | 1.228 / 1.303 | 98.197 / 118.033 | 15 / 17 | $0,14 / $0,14 |
| `change-cupones` | 5/5 | 0/5 | 176 / 324 | 2.451 / 3.142 | 108.846 / 89.794 | 29 / 34 | $0,19 / $0,18 |
| `change-grande-partes` | 5/5 | 0/5 | 242 / 385 | 4.997 / 4.812 | 108.242 / 91.410 | 52 / 56 | $0,26 / $0,23 |
| `fix-commit-gitflow` | 5/5 | 0/5 | 42 / 46 | 951 / 1.028 | 119.738 / 114.660 | 15 / 16 | $0,14 / $0,13 |
| `fix-texto-boton` | 5/5 | 5/5 | 34 / 36 | 531 / 440 | 75.326 / 68.819 | 7 / 7 | $0,11 / $0,10 |
| `hotfix-gitflow` | 5/5 | 5/5 | 133 / 153 | 1.678 / 2.028 | 139.923 / 139.016 | 26 / 27 | $0,17 / $0,16 |
| `iterar-propuesta` | 5/5 | 5/5 | 79 / 97 | 1.171 / 1.376 | 69.703 / 87.482 | 13 / 17 | $0,13 / $0,14 |
| `pantalla-nueva-fix` | 5/5 | 5/5 | 61 / 79 | 612 / 709 | 76.225 / 77.383 | 10 / 11 | $0,12 / $0,11 |
| `solo-lectura` | 5/5 | 5/5 | 100 / 184 | 900 / 843 | 83.967 / 66.217 | 12 / 11 | $0,13 / $0,11 |
| `spec-envio-gratis` | 5/5 | 5/5 | 55 / 83 | 1.145 / 1.290 | 94.037 / 97.581 | 13 / 16 | $0,14 / $0,13 |

Notas:
- Sin seckert, `change-grande-partes` también divide en fases, pero dentro de un solo documento. El juez de `ofrece-juntar` lo daba por bueno y se ajustó para exigir archivos separados.
- `varios-changes` mira la lista de archivos creados (`target: files`): buscar dos `file_path` en la traza fallaba en corridas en paralelo.
- `bug-test-primero` sin seckert bajó de 3/5 a 0/5 y `aprobar-con-dale` subió de 1/5 a 2/5: variación del brazo sin plugin, que no cambió.

## 0.4.0 · 2026-10-30

Modelo `claude-opus-5-5`, 5 corridas por caso y brazo (100 sesiones). Costo: $13,97.

Cambio respecto de la corrida anterior: se recortó el contexto fijo. El texto de inicio pasó de 2,6 KB a 1,3 KB, sacando la lista de intenciones que repetía las descripciones de las skills, y las descripciones de 3,3 KB a 2,5 KB.

| | Antes | Después |
|---|---|---|
| Flujo con seckert / sin seckert | 50/50 · 34/50 | 50/50 · 34/50 |
| Contexto fijo de seckert por turno | +2.240 tokens | **+1.554 tokens** (−31%) |
| Costo por pedido con seckert / sin seckert | $0,149 / $0,132 (+13%) | $0,145 / $0,135 (**+7%**) |
| Palabras por respuesta con seckert / sin seckert | 90 / 128 | 88 / 128 |

| Caso | Con seckert | Sin seckert | Palabras | Tokens de salida | Contexto leído | Segundos | Costo |
|---|---|---|---|---|---|---|---|
| `aprobar-con-dale` | 5/5 | 1/5 | 147 / 236 | 3.528 / 3.777 | 224.730 / 157.558 | 48 / 48 | $0,23 / $0,21 |
| `bug-test-primero` | 5/5 | 3/5 | 59 / 79 | 1.134 / 1.200 | 105.534 / 107.020 | 17 / 16 | $0,13 / $0,12 |
| `change-cupones` | 5/5 | 0/5 | 169 / 282 | 2.565 / 3.819 | 116.693 / 94.694 | 31 / 39 | $0,18 / $0,19 |
| `fix-commit-gitflow` | 5/5 | 0/5 | 39 / 51 | 897 / 1.080 | 111.990 / 119.838 | 17 / 23 | $0,13 / $0,13 |
| `fix-texto-boton` | 5/5 | 5/5 | 36 / 37 | 514 / 461 | 75.238 / 76.035 | 9 / 9 | $0,11 / $0,10 |
| `hotfix-gitflow` | 5/5 | 5/5 | 131 / 151 | 1.647 / 1.818 | 123.002 / 122.050 | 33 / 33 | $0,16 / $0,15 |
| `iterar-propuesta` | 5/5 | 5/5 | 86 / 113 | 1.355 / 1.496 | 81.736 / 84.282 | 16 / 17 | $0,13 / $0,13 |
| `pantalla-nueva-fix` | 5/5 | 5/5 | 61 / 77 | 639 / 638 | 76.370 / 70.347 | 13 / 11 | $0,11 / $0,10 |
| `solo-lectura` | 5/5 | 5/5 | 105 / 177 | 943 / 912 | 79.766 / 62.981 | 12 / 11 | $0,12 / $0,11 |
| `spec-envio-gratis` | 5/5 | 5/5 | 42 / 82 | 1.100 / 1.231 | 98.098 / 90.340 | 13 / 13 | $0,13 / $0,12 |

Cosas del recorte:
- La primera versión decía "un commit chico estando en una rama protegida va en `fix/<slug>`", y Claude lo leyó como una orden: en 3 de 5 bugs creó la rama sin que se la pidieran, y una vez commiteó. Se corrigió con "si el usuario pide commitear…" y se agregó el chequeo `sin-rama-ni-commit` a los casos chicos.
- `test-antes-del-fix` ahora acepta el test creado desde Bash (`cat > tests/…`), no solo con Write.

## Antes del recorte de contexto · 2026-10-30

Modelo `claude-opus-5-5`, Claude Code 2.1.314, **5 corridas por caso y brazo** (100 sesiones). Costo: $14,05.

Cambios respecto de 0.3.1:
- Cambiar el valor de una regla que ya existe (un umbral, un precio) es SPEC aunque sea de dinero.
- El contexto de inicio pide un test que reproduzca el bug antes del fix.
- El contexto de inicio pide que un commit hecho en una rama protegida vaya en `fix/<slug>`.

### Sigue el flujo: 50/50 con seckert, 34/50 sin seckert

| Caso | Con seckert | Sin seckert |
|---|---|---|
| `change-cupones`: lógica nueva de dinero → propuesta, sin tocar código | 5/5 | 0/5 |
| `aprobar-con-dale`: "dale" aprueba, anota y crea `feature/…` | 5/5 | 0/5 |
| `fix-commit-gitflow`: no commitea en `develop` | 5/5 | 0/5 |
| `bug-test-primero`: test que falla antes del fix | 5/5 | 4/5 |
| `iterar-propuesta` | 5/5 | 5/5 |
| `spec-envio-gratis` | 5/5 | 5/5 |
| `fix-texto-boton` | 5/5 | 5/5 |
| `pantalla-nueva-fix` | 5/5 | 5/5 |
| `solo-lectura` | 5/5 | 5/5 |
| `hotfix-gitflow` | 5/5 | 5/5 |

En `change-cupones`, sumando todas las corridas del día (20 por brazo), con seckert ninguna tocó `src/` antes de la aprobación.

### Eficiencia (promedio por corrida)

| Caso | Palabras de la respuesta | Tokens de salida | Contexto leído | Segundos | Costo |
|---|---|---|---|---|---|
| `aprobar-con-dale` | 137 / 227 | 3.209 / 3.547 | 206.159 / 166.018 | 45 / 46 | $0,22 / $0,20 |
| `bug-test-primero` | 58 / 102 | 1.112 / 1.399 | 105.146 / 114.890 | 16 / 19 | $0,14 / $0,13 |
| `change-cupones` | 179 / 281 | 2.499 / 3.426 | 115.533 / 90.369 | 31 / 37 | $0,18 / $0,18 |
| `fix-commit-gitflow` | 53 / 59 | 777 / 849 | 99.471 / 88.898 | 16 / 16 | $0,13 / $0,11 |
| `fix-texto-boton` | 47 / 33 | 552 / 424 | 81.876 / 68.715 | 8 / 7 | $0,12 / $0,09 |
| `hotfix-gitflow` | 138 / 144 | 1.665 / 1.733 | 139.932 / 120.517 | 34 / 31 | $0,17 / $0,14 |
| `iterar-propuesta` | 73 / 110 | 1.355 / 1.576 | 105.045 / 96.692 | 17 / 19 | $0,15 / $0,14 |
| `pantalla-nueva-fix` | 65 / 77 | 691 / 666 | 83.144 / 70.431 | 12 / 11 | $0,12 / $0,10 |
| `solo-lectura` | 102 / 172 | 941 / 805 | 86.724 / 52.523 | 13 / 11 | $0,13 / $0,10 |
| `spec-envio-gratis` | 47 / 74 | 1.090 / 1.193 | 101.283 / 93.739 | 13 / 17 | $0,14 / $0,12 |
| **Promedio** | **90 / 128** | **1.389 / 1.562** | **112.431 / 96.279** | **21 / 21** | **$0,15 / $0,13** |

- **Respuestas un 30% más cortas** con seckert (90 contra 128 palabras), y un 11% menos de tokens de salida.
- **Mismo tiempo** (21 segundos).
- **Un 17% más de contexto leído y unos $0,02 más por corrida.** Es el contexto de inicio y las descripciones de las skills, que se releen en cada turno. Pesa más en las tareas cortas: `solo-lectura` lee 87 mil tokens contra 53 mil. Es el próximo lugar para recortar.
- En `fix-texto-boton`, seckert responde un poco más largo (47 contra 33 palabras). Es el único caso donde pasa.

### Historial de ajustes del día

- `spec-envio-gratis` 1/3 → 3/3: el skill trataba cualquier cambio de dinero como CHANGE.
- `bug-test-primero` 0/3 → 3/3: sin cargar el skill, Claude no sabía que el test va primero.
- `fix-commit-gitflow`: con seckert nunca commiteó en `develop`, pero usaba `feature/` en vez de `fix/`.
- Chequeos corregidos: una regex con `(?i)`, que JS no soporta; `git checkout -q -b` no se reconocía; y el juez de aprobación, que exigía pedir el "sí" cuando seckert debe preguntar primero.

## 0.3.1 · 2026-10-30

Primeros 5 casos. Costo: $5,37.

| Caso | Con seckert | Sin seckert |
|---|---|---|
| `change-cupones` | 2/3 | 0/3 |
| `fix-texto-boton` | 3/3 | 3/3 |
| `iterar-propuesta` | 3/3 | 3/3 |
| `bug-test-primero` | 2/3 | 2/3 |
| `spec-envio-gratis` | 1/3 | 3/3 |
