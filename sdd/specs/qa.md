# QA

## Verificar en el navegador

Lo que solo se ve en la app se verifica con Chrome DevTools MCP, con ventana visible: el What recorrido como usuario, cero errores de consola y de red, 375/768/1280 px, estados vacío/cargando/error y Lighthouse de accesibilidad (problemas, no puntaje). El resultado es texto en la tabla de veredictos. Sin `SECKERT_EVIDENCIAS`, no se guardan ni se pasan capturas. Los datos, solo contra la base aislada de la sección QA.

## Instalar el MCP

Si falta, se ofrece en una línea sin frenar la verificación. Con el sí: `claude mcp add --scope local`, con Google Chrome si está (`scripts/find-chrome.sh`) o con Chrome for Testing en `~/.cache/seckert/chrome-for-testing` vía `--executablePath`. Otros Chromium no cuentan. Después hay que reiniciar Claude Code.

## Sin navegador

Si el usuario no lo quiere, se guarda `env.SECKERT_QA = "sin-navegador"` en el `.claude/settings.local.json` del proyecto (preferencia personal, fuera del repo) y no se vuelve a ofrecer. El contexto de inicio lo avisa leyendo el env o el archivo. Lo visual queda `NO VERIFICABLE (sin navegador)`.

## Expo

Lo visual se mira en el simulador (`xcrun simctl io booted screenshot`, o `adb` en Android). `expo start --web` solo sirve para flujos y lógica.

## Evidencias

Con `SECKERT_EVIDENCIAS=<carpeta>` (env o `.claude/settings.local.json`), verify crea la carpeta y guarda ahí una captura por punto del What visto en la app (`<slug>-<n>-<punto>.png`) y un video del flujo (`<slug>-flujo.webm`). La tabla del veredicto enlaza la captura de cada fila y, debajo, el video. Si no puede escribir, sigue verificando y lo dice en una línea. El contexto de inicio muestra la variable. Subir las evidencias a otro lado queda fuera de seckert.
