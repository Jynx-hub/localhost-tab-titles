# Releasing

## Every release

1. Bump `version` in `extension/manifest.json`.
2. `npm test`: must be all green.
3. `./scripts/package.sh` writes `dist/localhost-tab-titles-<version>.zip` (the dev-only `key` field is stripped).
4. Upload it in the [Chrome Web Store developer dashboard](https://chrome.google.com/webstore/devconsole).
5. Tag it: `git tag v<version> && git push --tags`, and attach the zip to a GitHub release.

## First Web Store upload (one time)

The Store gives the extension its own ID, different from the unpacked build's
(`ipkpcfbbpicilgfambbgcihgeeodgmlo`, fixed by the `key` in `extension/manifest.json`). The
helper only answers IDs it knows, so after the listing is created:

1. Copy the Store item ID from the dashboard.
2. Add it to `EXTENSION_IDS` in `helper/install.sh` (keep the unpacked ID too) and push.
3. Put the Store link in `README.md` and push.

Users who installed the helper before then will see "Helper doesn't allow this extension"
in the popup, which tells them to rerun the installer.

Listing copy and permission justifications: [STORE.md](STORE.md).
