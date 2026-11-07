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
   - Always `--scope local` (this project, this user, nothing written to the repo). Never `--headless`: the window opens so the user sees the QA.
5. Say in one line what you installed and where, and that Claude Code must restart for the MCP to load; until then, what's only visible in the app is `NO VERIFICABLE`. To remove it: `claude mcp remove chrome-devtools -s local` and delete `~/.cache/seckert/chrome-for-testing`.

## Checks on every verification

With the MCP loaded:

1. **Start the app** with the command and URL from the `## QA` section of `AGENTS.md`; if it's running, use it. Data only against the isolated database that section names: never real data or production. If the section is missing or incomplete, infer it from the repo (`dev` script, `supabase/`, `docker-compose`) and at the end propose the missing lines using `${CLAUDE_PLUGIN_ROOT}/skills/workflow/agents-template.md`. Without a clear isolated database, don't touch data: what needs it is `NO VERIFICABLE`.
2. **Walk the What**: each point visible in the app, doing the flow as a user (`navigate_page`, `take_snapshot` to read the page, `click`, `fill`/`fill_form`, `wait_for`). With `design:`, compare against the artifact; `take_screenshot` is for you to look at, not saved or shown to the user.
3. **Console and network** during the flow: zero errors in `list_console_messages` and zero failed requests (4xx, 5xx or no response) in `list_network_requests`. Both reset on navigation: check them before changing page.
4. **Three widths**: 375, 768 and 1280 px with `resize_page`. Look for clipped content, horizontal scroll, overlapping elements.
5. **States** the artifact shows or the code handles: empty, loading and error. Trigger them if you can (empty isolated database, slow network with `emulate`, a backend error); otherwise `NO VERIFICABLE` with the reason.
6. **Accessibility** with `lighthouse_audit`: report the problems found, not the score.

Results go as text: one row per point in the verdict table (what you did and saw), plus one row per failing check. What you couldn't check is `NO VERIFICABLE`, with the reason.

## Expo

In an Expo project (`expo` in `package.json` dependencies) the native app doesn't run in the browser:

- **Visual**: in the iOS simulator (macOS). If none is booted (`xcrun simctl list devices booted`), start the app with `npx expo start --ios`. To look at the screen: `xcrun simctl io booted screenshot "$TMPDIR/seckert-sim.png"`, read it, compare against the artifact and delete it; it's for you, not saved or shown to the user. On Android: `adb exec-out screencap -p > "$TMPDIR/seckert-sim.png"`.
- **Flows and logic**: `npx expo start --web` with DevTools works for flows, console and network. Not as a visual check (react-native-web doesn't render like native), and anything using native modules (camera, notifications) fails there: `NO VERIFICABLE` on web.
- The simulator can't be driven from here: what requires native interaction and isn't visible on web is `NO VERIFICABLE`, with the reason.
