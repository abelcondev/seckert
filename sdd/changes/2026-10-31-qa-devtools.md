---
status: done
specs: [verify, qa]
design: none
branch: feature/qa-devtools
---

# QA automático con Chrome DevTools MCP

## Why

Hoy la verificación visual depende de que haya una forma de ver la app, y si no la hay, el humano termina levantándola y mirando. Queremos que Claude verifique en el navegador por su cuenta, con chequeos fijos, y que al humano le llegue en texto qué se cumple y qué no, así su tiempo va a la dirección, lo sensible y el gusto visual. La herramienta es Chrome DevTools MCP: es la que usa el equipo y trae lo que hace falta para verificar (consola, red, Lighthouse, emulación de anchos).

## What

**Instalar DevTools sin bloquear**
- Cuando verify o design necesitan el navegador y el MCP de Chrome DevTools no está, seckert lo ofrece en una línea. No bloquea: si el usuario dice que no, sigue con lo que tenga (tests, curl) y dice qué quedó sin verificar visualmente.
- Si dice que sí, seckert busca **Google Chrome** en el sistema (macOS: `/Applications/Google Chrome.app`; Linux: `google-chrome` / `google-chrome-stable`; Windows: Program Files).
  - El MCP se instala **por proyecto y solo para quien lo instala** (`claude mcp add --scope local`). No se escribe en el repo.
  - Si está, instala el MCP tal cual.
  - Si no está, o solo hay otros Chromium (Brave, Edge, Arc…), que el MCP no garantiza, baja **Chrome for Testing** con `npx @puppeteer/browsers install chrome@stable --path ~/.cache/seckert/chrome-for-testing` y configura el MCP con `--executablePath` apuntando a ese ejecutable. Si ya está bajado de otro proyecto, lo reutiliza. No instala un navegador en el sistema ni cambia el navegador por defecto.
- Al terminar, dice en una línea qué instaló y dónde, y que reinicie Claude Code para que cargue el MCP.
- Si el usuario dijo que no, seckert guarda `"env": { "SECKERT_QA": "sin-navegador" }` en el `.claude/settings.local.json` del proyecto, sin pisar lo que ya tenga, y no lo vuelve a ofrecer en ese proyecto. Es una preferencia personal: no se sube al repo y sobrevive a las actualizaciones del plugin. El contexto de inicio de sesión le avisa a Claude cuando `SECKERT_QA=sin-navegador`.

**Chequeos fijos en cada verificación en el navegador**
- El navegador se abre **con ventana**, para que el usuario vea que el QA se está haciendo.
- Comprueba en el navegador que se cumple lo que se programó: cada punto del What, recorriendo el flujo.
- Cero errores en consola y cero requests fallidos (4xx/5xx o red caída) durante el flujo.
- Revisa la pantalla en 3 anchos: 375, 768 y 1280.
- Los estados que muestra el artifact o que el código maneja: vacío, cargando, error.
- Auditoría de accesibilidad con Lighthouse; se reportan los problemas, no el puntaje.
- Lo que no pudo comprobar lo dice como `NO VERIFICABLE`, con el motivo.

**Resultado en texto, sin imágenes**
- El resultado es la tabla de veredictos con una línea de evidencia por punto (qué hizo y qué vio). No guarda capturas ni las pasa al humano: Claude puede mirar la pantalla para comparar, pero el humano lee el resultado en texto.

**Sección QA en el AGENTS.md del proyecto**
- `agents-template.md` suma una sección QA corta: cómo levantar la app y en qué URL, y cómo conseguir una base aislada para verificar (p.ej. `supabase start` + `supabase db reset`, o una base de test en Docker). El "sin navegador" no va acá: es local (ver arriba).
- verify usa lo que declare esa sección; si falta y lo necesita, lo deduce del repo y propone agregarlo.

**Expo**
- En un proyecto Expo, la verificación visual usa el simulador: Claude mira la pantalla con `xcrun simctl io booted screenshot` y la compara contra el artifact (la captura es para Claude, no se guarda). `expo start --web` con DevTools sirve para flujos y lógica, no como verificación visual (react-native-web no renderiza igual que nativo).

**Fuera de este change**
- Playwright Test para flujos críticos: primero un piloto a mano en un proyecto Next.js real, 2–3 changes, midiendo flakiness, tiempo ahorrado y regresiones atrapadas.
- Maestro para Expo.

## Preguntas abiertas


## Tasks

- [x] T1 `scripts/find-chrome.sh`: imprime la ruta de Google Chrome si está instalado (macOS, Linux, Windows) o nada; con test <!-- commit: 902a47e -->
- [x] T2 skill: flujo de instalación (detectar el MCP, ofrecer sin bloquear, Chrome o Chrome for Testing, `claude mcp add`, pedir reinicio, no repetir si dijo que no) <!-- commit: 5fccf5b 80fdb68 -->
- [x] T3 verify y design: chequeos fijos en la verificación en el navegador con ventana (What recorrido, consola, red, 3 anchos, estados, Lighthouse accesibilidad), resultado en texto <!-- commit: 60a8c2a -->
- [x] T4 `agents-template.md`: sección QA (levantar la app, base aislada, sin navegador) y que verify la use <!-- commit: 5fccf5b -->
- [x] T5 verify: ruta Expo con `simctl` para la verificación visual <!-- commit: 08467dc -->
- [x] T6 evals: `devtools-ausente` (sin el MCP → lo ofrece en una línea y sigue verificando sin bloquear) y `qa-sin-navegador` (con `seckert qa: sin navegador` → no lo ofrece) <!-- commit: 28098ae 499f49c -->
- [x] T7 README: qué instala seckert para verificar y cómo quitarlo; correr las evals afectadas y anotar en `evals/RESULTS.md` <!-- commit: ead2f3c 4aa35d8 -->

## Testing

- Runner: `claude plugin test .` (módulo) y `claude plugin eval .` (comportamiento)
- Nivel: risk
- Lógica: `find-chrome.sh` con test en el mismo cambio (T1); el comportamiento de las skills con las evals de T6.
- Presentación: no aplica

## Log

- **L1** (pedido original, verbatim): exploremos la 1,2,5,
sobre la 6, generalmente no hay un review.md en los projectos
sobre herramientas de testing para desarrollo web, yo uso chrome devtools enlazado a chrome for testing, hay mas formas de que se haga un testing qa automatico, quiero capaz que el humano tenga menos sitios donde se le necesite y que su tiempo se vaya donde mas se necesita
- 2026-10-31: stack de los proyectos: "usamos nextjs generalmente, y como yo tengo aveces preferencias por tanstack start, usamos supabase o postgresql y algunos projectos usan railway, yo tambien uso cloudflare, pero todos son tecnologias web, hay 1 projecto que uso expo donde yo valido con el simulador".
- 2026-10-31: instalar herramientas: "ofrecer instalarlo esta bien, pero no bloqueemos al usuario capaz el stack que utiliza no necesita playwright".
- 2026-10-31: se eligió DevTools y no Playwright MCP para que el agente verifique, después de buscar evidencia. Slack midió más de 200 corridas: los tests de Playwright generados por IA fallaron ~48% en un flujo de complejidad media y el agente que verifica costó $15–30 por corrida (https://slack.engineering/agentic-testing-where-agents-fit-in-the-e2e-testing-stack/). DevTools es para depurar y Playwright para manejar flujos (https://stevekinney.com/writing/driving-vs-debugging-the-browser). Por eso Playwright Test queda para un piloto aparte.
- 2026-10-31: navegador: "si no hay navegador web compatible, se traiga el chrome for testing nomas, creo que es el mas liviano, esto para no hacer descargar un navegador como tal al usuario". Aclarado: Chrome for Testing pesa casi lo mismo que Chrome, pero no se instala en el sistema, no se actualiza solo y se borra con su carpeta. `chrome-headless-shell` es más liviano pero el MCP no lo soporta oficialmente (solo Google Chrome y Chrome for Testing: https://github.com/ChromeDevTools/chrome-devtools-mcp).
- 2026-10-31: el usuario pidió escribirlo ("dale, escribilos ahora").
- 2026-10-31: ajustes del usuario: "yo diria que la instalacion sea por projecto no por user", "diria que si le abra la ventana para ver que el qa se esta haciendo" y "no se si es necesario capturas, basta con revisar si cumple lo que se codeo me parece y mencionarlo, porque tener imagenes va a ser algo complicado y ademas no hay mucho tiempo para ver imagenes". Se sacaron las capturas de evidencia (y su tarea), se resolvieron las preguntas de scope y de ventana, y quedó abierta si el scope por proyecto es compartido o local.
- 2026-10-31: respuestas del usuario: "lo que recomiendas, en cache. en agents.md esta bien". El scope es `local`, porque compartido llevaría al repo una ruta de Chrome for Testing que en otra máquina no existe. Chrome for Testing va en `~/.cache/seckert/chrome-for-testing`. "Sin navegador" se recuerda en el `AGENTS.md`. Sin preguntas abiertas.
- 2026-10-31: aprobado ("tenes el si para qa-devtools"). Rama `feature/qa-devtools` creada desde `main` (f2d1f39), con `verify-converge` ya mergeado.
- 2026-10-31: T1 hecha (902a47e). `scripts/find-chrome.sh` imprime la ruta de Google Chrome y sale con 0, o no imprime nada y sale con 1. Busca en `/Applications` y `~/Applications` en macOS, `google-chrome`/`google-chrome-stable` y `/opt/google/chrome` en Linux, y Program Files/LocalAppData en Windows. Otros Chromium no cuentan. Test escrito antes (RED: 5 fallos sin el script) en `tests/find-chrome.sh`, de shell porque `claude plugin test` no puede correr scripts: `sh tests/find-chrome.sh` da 7/7. En esta máquina no encuentra Chrome (exit 1). `claude plugin test .`: 13 pass, 0 fail.
- 2026-10-31: T2 hecha (487bb43). El flujo de instalación está en `skills/verify/navegador.md` y lo usan verify y design. Si el AGENTS.md dice `seckert qa: sin navegador`, no lo ofrece. Si no, lo ofrece en una línea y sigue verificando. Si el usuario dice que no, anota la línea en el AGENTS.md. Si dice que sí, usa `find-chrome.sh`: con Chrome instala directo; sin Chrome, `npx @puppeteer/browsers install chrome@stable --path ~/.cache/seckert/chrome-for-testing --format '{{path}}'` y `--executablePath`. Siempre `claude mcp add --scope local` y sin `--headless`. Comprobado en el código de @puppeteer/browsers (`lib/install.js`) que si esa versión ya está bajada la devuelve sin volver a bajarla. Las opciones de `claude mcp add` y `install` se comprobaron con `--help`.
- 2026-10-31: T3 hecha (60a8c2a). Chequeos fijos con los nombres de herramienta de la referencia oficial del MCP (`navigate_page`, `take_snapshot`, `list_console_messages`, `list_network_requests`, `resize_page`, `emulate`, `lighthouse_audit`). Resultado en texto; `take_screenshot` solo para que mire Claude.
- 2026-10-31: T4 hecha (57d05d9). Sección `## QA` en `agents-template.md`. verify la usa y, si falta, lo deduce del repo y propone agregarla. Sin una base aislada clara, no toca datos.
- 2026-10-31: T5 hecha (08467dc). Expo: lo visual en el simulador con `xcrun simctl io booted screenshot` (o `adb`); `expo start --web` solo para flujos y lógica. No se probó en un proyecto Expo real.
- 2026-10-31: T6 hecha (28098ae). Evals `devtools-ausente` y `qa-sin-navegador`, con scaffolds probados a mano.
- 2026-10-31: T7 hecha (ead2f3c). README: sección "En el navegador" (qué instala, dónde, cómo quitarlo, sin navegador, Expo), fila en la tabla del AGENTS.md, benchmark y `sh tests/find-chrome.sh` en Desarrollo. Evals con 3 corridas por brazo: `devtools-ausente` 3/3 con seckert y 0/3 sin seckert; `qa-sin-navegador` 3/3 y 0/3 ($2,19). En las trazas, la oferta sale en una línea al final y lo visual queda `NO VERIFICABLE (sin navegador)`. `devtools-ausente` cuesta $0,09 más por corrida con seckert. Las evals no tienen navegador: no prueban los chequeos dentro del navegador ni la instalación real.
- 2026-10-31: la ruta de Expo la prueba el usuario en la release ("la ruta expo lo probare yo cuando hagamos release, por ahora esta bien asi").
- 2026-10-31: cambio de requisito: el "sin navegador" se guarda en local y no en el `AGENTS.md` ("nosotros generalmente somos devs que trabaja 1 persona por projecto entero, asi que por ahora creo que estaria mejor en local nomas"). No va dentro del plugin porque la carpeta del plugin es una caché que se reemplaza en cada versión y es la misma para todos los proyectos. Va en `.claude/settings.local.json` con `env.SECKERT_QA`, el mismo mecanismo que `SECKERT_PROTECTED_BRANCHES`. Se reabren T2 (navegador.md y contexto de inicio), T4 (plantilla), T6 (eval `qa-sin-navegador`) y T7 (README y resultados).
- 2026-10-31: T2 y T4 rehechas (5fccf5b, 80fdb68). Si el usuario dice que no, `navegador.md` guarda `env.SECKERT_QA = "sin-navegador"` en `.claude/settings.local.json`, sin pisar lo que haya y comprobando que git lo ignore. El contexto de inicio avisa `QA: SECKERT_QA=sin-navegador`. Lee el valor del env o, si no llegó, directo del archivo: en el sandbox de las evals el `env` de `settings.local.json` no llegaba (`echo $SECKERT_QA` vacío), y Claude volvía a ofrecer DevTools (`no-ofrece` 0/3 con seckert). Probado a mano en un repo descartable: con el archivo avisa, sin archivo ni env no, y con el env solo también. La plantilla del AGENTS.md ya no tiene la línea "sin navegador".
- 2026-10-31: T6 pendiente de correr (499f49c actualiza la eval: la preferencia pasa a `.claude/settings.local.json`). La última corrida no sirve: se cortó por el límite de uso ("You've hit your 5-hour limit · resets 10:30pm (America/Lima)") y todas las sesiones dieron 0 sin llegar a hacer nada. En la traza, el contexto de inicio ya muestra `QA: SECKERT_QA=sin-navegador`. Falta volver a correr `qa-sin-navegador` y, con eso, T7 (README, specs y RESULTS).
- 2026-10-31: T6 y T7 hechas. `qa-sin-navegador`, con la preferencia en `.claude/settings.local.json`, da 3/3 con seckert y 0/3 sin seckert. Como `navegador.md` cambió, también se volvió a correr `devtools-ausente`: sigue en 3/3 y 0/3. Las dos corridas costaron $2,12. README, `sdd/specs/qa.md` y `evals/RESULTS.md` dicen ahora que el "sin navegador" es local (4aa35d8). `claude plugin test .`: 0 fail; `sh tests/find-chrome.sh`: 7/7.
- 2026-10-31 verify: PASA buscar Google Chrome en macOS, Linux y Windows (`sh tests/find-chrome.sh` 7/7); PASA "sin navegador" en `.claude/settings.local.json` con aviso en el contexto de inicio (probado en un repo temporal con el archivo, sin nada y solo con el env); PASA sección QA en `agents-template.md` sin la línea "sin navegador". PASA, comprobado leyendo `navegador.md` (y la eval `devtools-ausente` 3/3): ofrecer sin bloquear, `--scope local`, avisar qué se instaló y pedir reinicio, resultado en texto. NO VERIFICABLE: la descarga real de Chrome for Testing, los chequeos dentro del navegador (no hay MCP ni navegador) y la ruta de Expo, que el usuario prueba en la release. Comandos: `claude plugin test .` (13 pass, 0 fail), `sh tests/find-chrome.sh`, `session-context.sh` en un repo temporal, `claude mcp add --help`.
- 2026-10-31: cerrado ("dale, cerralo y abrí el PR"). Specs en `sdd/specs/qa.md`.
