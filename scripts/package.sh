#!/bin/bash
# Zips extension/ for upload to the Chrome Web Store.
# The Store assigns its own extension ID, so the dev-only "key" field is stripped from the zipped manifest.
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION="$(python3 -c 'import json; print(json.load(open("extension/manifest.json"))["version"])')"
OUT="dist/localhost-tab-titles-$VERSION.zip"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

cp -R extension/ "$STAGE/"
python3 - "$STAGE/manifest.json" <<'PY'
import json, sys
p = sys.argv[1]
m = json.load(open(p))
m.pop("key", None)
json.dump(m, open(p, "w"), indent=2, ensure_ascii=False)
PY

mkdir -p dist
rm -f "$OUT"
(cd "$STAGE" && zip -qr "$OLDPWD/$OUT" . -x '.*')
echo "$OUT"
