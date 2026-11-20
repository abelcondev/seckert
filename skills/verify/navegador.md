# Checking in the browser

Used by `seckert:verify` and `seckert:design` when the running app must be seen. The tool is Chrome DevTools MCP (`mcp__chrome-devtools__*`). In an Expo project, visuals go in the simulator: see [Expo](#expo).

## If the MCP isn't there

1. If the session-start context says `SECKERT_QA=sin-navegador`, or the project's `.claude/settings.local.json` has `"SECKERT_QA": "sin-navegador"` in `env`, don't offer it: verify with what there is (tests, curl) and mark what's only visible in the app as `NO VERIFICABLE (sin navegador)`.
2. Otherwise offer it in one line and don't block on it: "Para verificar en el navegador puedo instalar Chrome DevTools MCP en este proyecto, solo para vos. ¿Lo instalo?". Meanwhile continue with what doesn't need a browser.
3. If they say no, save the preference in the project's `.claude/settings.local.json`: add `"SECKERT_QA": "sin-navegador"` inside `env` without overwriting anything (if the file doesn't exist, create `{ "env": { "SECKERT_QA": "sin-navegador" } }`). Check with `git check-ignore -q .claude/settings.local.json` that git ignores it; if not, add it to `.gitignore`. Tell them in one line where it went and that deleting that line re-enables it. Don't offer it again this session; from the next one the session-start context says it.
4. If they say yes (needs `npx`; if missing, say so and install nothing):
   - Run `"${CLAUDE_PLUGIN_ROOT}/scripts/find-chrome.sh"`: it prints Google Chrome's path, or nothing. Brave, Edge, Arc or chromium don't count: the MCP only guarantees Chrome and Chrome for Testing.
   - With Google Chrome: `claude mcp add --scope local chrome-devtools -- npx -y chrome-devtools-mcp@latest`
   - Without it, download Chrome for Testing to a cache folder (not installed system-wide, default browser unchanged; reused if present):
     `npx -y @puppeteer/browsers install chrome@stable --path "$HOME/.cache/seckert/chrome-for-testing" --format '{{path}}'`
     and with the printed path: `claude mcp add --scope local chrome-devtools -- npx -y chrome-devtools-mcp@latest --executablePath "<path>"`
   - With `SECKERT_EVIDENCIAS` set, add `--workspace "<folder>"` at the end, with the folder as an absolute path: the MCP only writes inside its workspace roots.
   - Always `--scope local` (this project, this user, nothing written to the repo). Never `--headless`: the window opens so the user sees the QA.
5. Say in one line what you installed and where, and that Claude Code must restart for the MCP to load; until then, what's only visible in the app is `NO VERIFICABLE`. To remove it: `claude mcp remove chrome-devtools -s local` and delete `~/.cache/seckert/chrome-for-testing`.

## Checks on every verification

With the MCP loaded:

1. **Start the app** with the command and URL from the `## QA` section of `AGENTS.md`; if it's running, use it. Data only against the isolated database that section names: never real data or production. If the section is missing or incomplete, infer it from the repo (`dev` script, `supabase/`, `docker-compose`) and at the end propose the missing lines using `${CLAUDE_PLUGIN_ROOT}/skills/workflow/agents-template.md`. Without a clear isolated database, don't touch data: what needs it is `NO VERIFICABLE`.
2. **Walk the What**: each point visible in the app, doing the flow as a user (`navigate_page`, `take_snapshot` to read the page, `click`, `fill`/`fill_form`, `wait_for`). With `design:`, compare against the artifact. Without `SECKERT_EVIDENCIAS`, `take_screenshot` is for you to look at, not saved or shown to the user; with it, see [Evidence](#evidence).
3. **Console and network** during the flow: zero errors in `list_console_messages` and zero failed requests (4xx, 5xx or no response) in `list_network_requests`. Both reset on navigation: check them before changing page.
4. **Three widths**: 375, 768 and 1280 px with `resize_page`. Look for clipped content, horizontal scroll, overlapping elements.
5. **States** the artifact shows or the code handles: empty, loading and error. Trigger them if you can (empty isolated database, slow network with `emulate`, a backend error); otherwise `NO VERIFICABLE` with the reason.
6. **Accessibility** with `lighthouse_audit`: report the problems found, not the score.

Results go as text: one row per point in the verdict table (what you did and saw), plus one row per failing check. What you couldn't check is `NO VERIFICABLE`, with the reason.

## Evidence

Only when the session-start context or the environment has `SECKERT_EVIDENCIAS=<folder>`. Without it, nothing is saved, as above.

1. Before the flow, create the folder with `mkdir -p "<folder>"`.
2. Start recording with `screencast_start`, saving to `<folder>/<slug>-flujo.mp4`. Chrome records MP4 only: another extension gets changed to `.mp4`. Stop it with `screencast_stop` when the flow ends, before the three widths.
3. For each What point checked in the app, once you see it working (or failing), `take_screenshot` with `format: "webp"`, `quality: 80` and `filePath` = `<folder>/<slug>-<n>-<point>.webp`: `<slug>` is the change's, `<n>` the point's number in the What, `<point>` its first words in kebab-case (40 characters at most).
4. Use absolute paths. Overwrite files from a previous round of the same change.
5. If `take_screenshot` rejects `format`, use png (`.png`, no `format` or `quality`) for the rest and say it in one line at the end of the verdict.
6. If a write fails with "not within any of the configured workspace roots", the MCP was registered without the folder. Say in one line at the end of the verdict: `claude mcp remove chrome-devtools -s local` and add it again as in [If the MCP isn't there](#if-the-mcp-isnt-there) with `--workspace "<folder>"`, then restart Claude Code.
7. If the folder can't be created or a file can't be written for another reason, or the MCP lacks screencast tools, keep verifying. Say it in one line at the end of the verdict, with the reason. Without the MCP nothing is saved: that line says so, and no row links a file that doesn't exist.

Each point's row links its screenshot in the Evidence column, and a line after the table links the video.

## Expo

In an Expo project (`expo` in `package.json` dependencies) the native app doesn't run in the browser:

- **Visual**: in the iOS simulator (macOS). If none is booted (`xcrun simctl list devices booted`), start the app with `npx expo start --ios`. To look at the screen: `xcrun simctl io booted screenshot "$TMPDIR/seckert-sim.png"`, read it, compare against the artifact and delete it; it's for you, not saved or shown to the user. On Android: `adb exec-out screencap -p > "$TMPDIR/seckert-sim.png"`.
- **Flows and logic**: `npx expo start --web` with DevTools works for flows, console and network. Not as a visual check (react-native-web doesn't render like native), and anything using native modules (camera, notifications) fails there: `NO VERIFICABLE` on web.
- The simulator can't be driven from here: what requires native interaction and isn't visible on web is `NO VERIFICABLE`, with the reason.
