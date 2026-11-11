#!/bin/bash
# Installs the Localhost Tab Titles helper (a native messaging host) for every
# Chromium-based browser on this Mac: Dia, Chrome, Arc, Brave, Edge, Chromium, Vivaldi.
#
#   curl -fsSL https://raw.githubusercontent.com/Jynx-hub/localhost-tab-titles/main/helper/install.sh | bash
#
# Nothing runs in the background: the browser starts the helper only when the extension asks.
set -euo pipefail

HOST_NAME="com.localhost_tab_titles.helper"
# Extension IDs allowed to call the helper: the unpacked build (fixed by manifest "key").
# Add the Chrome Web Store ID here once the listing is live (see RELEASING.md).
EXTENSION_IDS=("ipkpcfbbpicilgfambbgcihgeeodgmlo")
RAW_URL="https://raw.githubusercontent.com/Jynx-hub/localhost-tab-titles/main/helper/tab-names-host.py"
INSTALL_DIR="${LTT_INSTALL_DIR:-$HOME/Library/Application Support/localhost-tab-titles}"
APP_SUPPORT="$HOME/Library/Application Support"
BROWSERS=(
  "Dia/User Data"
  "Google/Chrome"
  "Google/Chrome Beta"
  "Google/Chrome Canary"
  "Chromium"
  "Arc/User Data"
  "BraveSoftware/Brave-Browser"
  "Microsoft Edge"
  "Vivaldi"
)

die() { echo "error: $*" >&2; exit 1; }

[ "$(uname)" = "Darwin" ] || die "this installer is macOS-only (see README for Linux)."
PY="$(command -v python3)" || die "python3 not found. Install the Xcode Command Line Tools: xcode-select --install"
"$PY" -c 'import sys; sys.exit(sys.version_info < (3, 8))' 2>/dev/null || die "python3 3.8 or newer is required."
command -v git >/dev/null || die "git not found. Install the Xcode Command Line Tools: xcode-select --install"
[ -x /usr/sbin/lsof ] || command -v lsof >/dev/null || die "lsof not found."

# 1. Helper script: from a local clone if we're in one, otherwise download it.
mkdir -p "$INSTALL_DIR"
# When piped from curl there's no script file (BASH_SOURCE is empty): always download then.
SCRIPT_DIR=""
[ -n "${BASH_SOURCE[0]:-}" ] && SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -n "$SCRIPT_DIR" ] && [ -f "$SCRIPT_DIR/tab-names-host.py" ]; then
  cp "$SCRIPT_DIR/tab-names-host.py" "$INSTALL_DIR/tab-names-host.py"
else
  curl -fsSL "$RAW_URL" -o "$INSTALL_DIR/tab-names-host.py" || die "couldn't download the helper from $RAW_URL"
fi

# 2. Launcher. Browsers start native hosts with a bare environment, so pin python and PATH.
cat > "$INSTALL_DIR/host" <<LAUNCHER
#!/bin/bash
export PATH="/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:/usr/local/bin"
exec "$PY" "$INSTALL_DIR/tab-names-host.py" "\$@"
LAUNCHER
chmod +x "$INSTALL_DIR/host" "$INSTALL_DIR/tab-names-host.py"

# 3. Host manifest for each installed browser (or the dirs in LTT_HOST_DIRS, colon-separated).
dirs=()
if [ -n "${LTT_HOST_DIRS:-}" ]; then
  IFS=: read -r -a dirs <<< "$LTT_HOST_DIRS"
else
  for b in "${BROWSERS[@]}"; do
    [ -d "$APP_SUPPORT/$b" ] && dirs+=("$APP_SUPPORT/$b/NativeMessagingHosts")
  done
fi
[ ${#dirs[@]} -gt 0 ] || die "no Chromium-based browser found in $APP_SUPPORT."

for d in "${dirs[@]}"; do
  mkdir -p "$d"
  "$PY" - "$d/$HOST_NAME.json" "$HOST_NAME" "$INSTALL_DIR/host" "${EXTENSION_IDS[@]}" <<'MANIFEST'
import json, sys
out, name, path, *ids = sys.argv[1:]
with open(out, "w") as f:
    json.dump({"name": name, "description": "Localhost Tab Titles helper", "path": path,
               "type": "stdio", "allowed_origins": [f"chrome-extension://{i}/" for i in ids]}, f, indent=2)
MANIFEST
  echo "  ✓ ${d#$APP_SUPPORT/}"
done

# 4. Self-test: send the helper a ping exactly the way the browser would.
"$PY" - "$INSTALL_DIR/host" <<'SELFTEST' || die "helper installed but didn't answer a test message."
import json, struct, subprocess, sys
msg = json.dumps({"ping": True}).encode()
out = subprocess.run([sys.argv[1]], input=struct.pack("<I", len(msg)) + msg, capture_output=True, timeout=10).stdout
sys.exit(0 if json.loads(out[4:]).get("ok") else 1)
SELFTEST
echo "Helper installed. Reload your localhost tabs."
