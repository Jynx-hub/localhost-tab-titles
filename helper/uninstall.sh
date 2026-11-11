#!/bin/bash
# Stops and removes the helper LaunchAgent.
LABEL="com.localhost-tab-titles.helper"
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
rm -f "$HOME/Library/LaunchAgents/$LABEL.plist"
rm -rf "$HOME/Library/Application Support/localhost-tab-titles"
echo "Helper removed. Tabs will fall back to host:port."
