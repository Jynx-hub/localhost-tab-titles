#!/bin/bash
# Removes the Localhost Tab Titles helper from every browser and deletes its files.
HOST_NAME="com.localhost_tab_titles.helper"
APP_SUPPORT="$HOME/Library/Application Support"
INSTALL_DIR="${LTT_INSTALL_DIR:-$APP_SUPPORT/localhost-tab-titles}"

if [ -n "${LTT_HOST_DIRS:-}" ]; then
  IFS=: read -r -a dirs <<< "$LTT_HOST_DIRS"
  for d in "${dirs[@]}"; do rm -f "$d/$HOST_NAME.json"; done
else
  find "$APP_SUPPORT" -maxdepth 4 -path "*/NativeMessagingHosts/$HOST_NAME.json" -delete 2>/dev/null
fi
rm -rf "$INSTALL_DIR"
echo "Helper removed. Tabs will fall back to localhost:<port>."
