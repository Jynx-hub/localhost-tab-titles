#!/bin/bash
# Installs the helper as a macOS LaunchAgent so it starts at login and stays running.
set -euo pipefail

LABEL="com.localhost-tab-titles.helper"
SRC="$(cd "$(dirname "$0")" && pwd)/tab-names.py"
DEST_DIR="$HOME/Library/Application Support/localhost-tab-titles"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

[ "$(uname)" = "Darwin" ] || { echo "install.sh is macOS-only. Run helper/tab-names.py with your own process manager." >&2; exit 1; }
PY="$(command -v python3)" || { echo "python3 not found (install Xcode Command Line Tools: xcode-select --install)" >&2; exit 1; }
command -v git >/dev/null || { echo "git not found" >&2; exit 1; }

mkdir -p "$DEST_DIR" "$HOME/Library/LaunchAgents"
cp "$SRC" "$DEST_DIR/tab-names.py"

cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array><string>$PY</string><string>$DEST_DIR/tab-names.py</string></array>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:/usr/local/bin</string></dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardErrorPath</key><string>$DEST_DIR/helper.log</string>
</dict>
</plist>
PLIST

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Helper installed and running on http://127.0.0.1:47123"
echo "Reload your localhost tabs to see project names."
