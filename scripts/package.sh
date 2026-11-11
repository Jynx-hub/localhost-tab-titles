#!/bin/bash
# Zips extension/ for upload to the Chrome Web Store.
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION="$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' extension/manifest.json)"
mkdir -p dist
OUT="dist/localhost-tab-titles-$VERSION.zip"
rm -f "$OUT"
(cd extension && zip -qr "../$OUT" . -x '.*')
echo "$OUT"
