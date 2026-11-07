#!/bin/sh
# Tests de scripts/find-chrome.sh. Correr: sh tests/find-chrome.sh
# El script lee las rutas del sistema bajo SECKERT_FIND_CHROME_ROOT y busca comandos en PATH,
# así que cada caso arma un sistema falso en un directorio temporal.
script="$(cd "$(dirname "$0")/.." && pwd)/scripts/find-chrome.sh"
fails=0

check() { # nombre esperado obtenido
  if [ "$2" = "$3" ]; then echo "(pass) $1"; else echo "(fail) $1"; echo "  esperado: '$2'"; echo "  obtenido: '$3'"; fails=$((fails + 1)); fi
}

fake() { # arma un ejecutable vacío en la ruta dada
  mkdir -p "$(dirname "$1")" && printf '#!/bin/sh\n' > "$1" && chmod +x "$1"
}

run() { # root path -> salida del script
  SECKERT_FIND_CHROME_ROOT="$1" PATH="$2" HOME="$1/home" LOCALAPPDATA= ProgramFiles= sh "$script" 2>/dev/null
}

t=$(mktemp -d)
mkdir -p "$t/empty/home" "$t/bin-empty"
check "sin Chrome no imprime nada" "" "$(run "$t/empty" "$t/bin-empty:/usr/bin:/bin")"
run "$t/empty" "$t/bin-empty:/usr/bin:/bin" >/dev/null; check "sin Chrome sale con 1" "1" "$?"

mac="$t/mac/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
fake "$mac"; mkdir -p "$t/mac/home"
check "macOS: Chrome en /Applications" "$mac" "$(run "$t/mac" "$t/bin-empty:/usr/bin:/bin")"

user="$t/macuser/home/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
fake "$user"
check "macOS: Chrome en ~/Applications" "$user" "$(run "$t/macuser" "$t/bin-empty:/usr/bin:/bin")"

mkdir -p "$t/linux/home"; fake "$t/linux-bin/google-chrome-stable"
check "Linux: google-chrome-stable en el PATH" "$t/linux-bin/google-chrome-stable" "$(run "$t/linux" "$t/linux-bin:/usr/bin:/bin")"

mkdir -p "$t/brave/home"; fake "$t/brave-bin/brave-browser"; fake "$t/brave-bin/chromium"
check "otros Chromium no cuentan" "" "$(run "$t/brave" "$t/brave-bin:/usr/bin:/bin")"

win="$t/win/pf/Google/Chrome/Application/chrome.exe"
fake "$win"; mkdir -p "$t/win/home"
check "Windows: Chrome en Program Files" "$win" "$(SECKERT_FIND_CHROME_ROOT="$t/win" PATH="$t/bin-empty:/usr/bin:/bin" HOME="$t/win/home" ProgramFiles="$t/win/pf" sh "$script" 2>/dev/null)"

rm -rf "$t"
[ "$fails" -eq 0 ] && echo "find-chrome: todo pasa" || { echo "find-chrome: $fails fallan"; exit 1; }
