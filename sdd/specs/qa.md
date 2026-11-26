# QA

## Verificar en el navegador

Lo que solo se ve en la app se verifica con Chrome DevTools MCP, con ventana visible: el What recorrido como usuario, cero errores de consola y de red, 375/768/1280 px, estados vacío/cargando/error y Lighthouse de accesibilidad (problemas, no puntaje). Lo hace el agente `seckert-navegador` (Sonnet) en su propio contexto, lanzado por verify y design, y devuelve solo las filas de veredicto y las rutas de las evidencias. Sin el MCP cargado no se lanza: la sesión marca esos puntos `NO VERIFICABLE (sin navegador)`. Lee la página con `take_snapshot` y usa capturas solo para comparar con el artifact o guardar evidencia. Dentro de `seckert-implementer`, que no puede lanzar otro agente, la revisión la hace el propio implementer. El resultado es texto en la tabla de veredictos. Sin `SECKERT_EVIDENCIAS`, no se guardan ni se pasan capturas. Los datos, solo contra la base aislada de la sección QA.

## Instalar el MCP

Si falta, se ofrece en una línea sin frenar la verificación. Con el sí: `claude mcp add --scope local`, con Google Chrome si está (`scripts/find-chrome.sh`) o con Chrome for Testing en `~/.cache/seckert/chrome-for-testing` vía `--executablePath`. Otros Chromium no cuentan. Después hay que reiniciar Claude Code.

## Sin navegador

Si el usuario no lo quiere, se guarda `env.SECKERT_QA = "sin-navegador"` en el `.claude/settings.local.json` del proyecto (preferencia personal, fuera del repo) y no se vuelve a ofrecer. El contexto de inicio lo avisa leyendo el env o el archivo. Lo visual queda `NO VERIFICABLE (sin navegador)`.

## Expo

Lo visual se mira en el simulador (`xcrun simctl io booted screenshot`, o `adb` en Android). `expo start --web` solo sirve para flujos y lógica.

## Evidencias

Con `SECKERT_EVIDENCIAS=<carpeta>` (env o `.claude/settings.local.json`), verify crea la carpeta y guarda ahí una captura por punto del What visto en la app (`<slug>-<n>-<punto>.webp`, calidad 80) y un video del flujo (`<slug>-flujo.mp4`). Con `1` o `true`, la carpeta es `.seckert/evidencias`. Una ruta relativa se toma desde la raíz del proyecto. Si la carpeta queda dentro del repo y git no la ignora, verify la suma a `.git/info/exclude`: no se commitea ni deja cambios. Si el MCP no acepta webp, las capturas salen en png y verify lo dice en una línea. La tabla del veredicto enlaza la captura de cada fila y, debajo, el video. El MCP solo escribe dentro de sus workspace roots, y el proyecto ya es una. Con la carpeta fuera del proyecto, se instala con `--workspace "<carpeta>"`. Si una escritura falla por las roots, el veredicto trae los comandos para registrarlo de nuevo, listos para copiar. Si no puede escribir por otro motivo, sigue verificando y lo dice en una línea. El contexto de inicio muestra la carpeta. Subir las evidencias a otro lado queda fuera de seckert.
