#!/bin/sh
# Imprime la ruta de Google Chrome si está instalado y sale con 0; si no, no imprime nada y sale con 1.
# Solo cuenta Google Chrome: chrome-devtools-mcp soporta oficialmente Chrome y Chrome for Testing,
# y otros Chromium (Brave, Edge, Arc, chromium) "may work, but this is not guaranteed".
# SECKERT_FIND_CHROME_ROOT antepone una raíz a las rutas fijas del sistema (solo para los tests).

root=${SECKERT_FIND_CHROME_ROOT:-}

found() {
  [ -n "$1" ] && [ -x "$1" ] && { printf '%s\n' "$1"; exit 0; }
}

# macOS
found "$root/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -n "$HOME" ] && found "$HOME/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# Linux
for cmd in google-chrome google-chrome-stable; do
  found "$(command -v "$cmd" 2>/dev/null)"
done
found "$root/opt/google/chrome/chrome"

# Windows (Git Bash / MSYS)
[ -n "$ProgramFiles" ] && found "$ProgramFiles/Google/Chrome/Application/chrome.exe"
pf86=$(printenv 'ProgramFiles(x86)' 2>/dev/null)
[ -n "$pf86" ] && found "$pf86/Google/Chrome/Application/chrome.exe"
[ -n "$LOCALAPPDATA" ] && found "$LOCALAPPDATA/Google/Chrome/Application/chrome.exe"

exit 1
