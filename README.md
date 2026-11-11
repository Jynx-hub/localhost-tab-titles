# Localhost Tab Titles

Running five dev servers and every tab says "Create Next App"? This extension renames
localhost tabs so you can tell them apart:

```
my-app · 3000
my-app-feature-login · 3001
api · 8080
```

Built for [Dia](https://www.diabrowser.com/). It also works in Chrome, Arc, Brave, Edge, and
other Chromium browsers.

## What it does

- **On its own:** every `localhost` / `127.0.0.1` / `0.0.0.0` tab is titled `localhost:<port>`.
- **With the optional helper (macOS):** tabs are titled `<project folder> · <port>`. If you
  use git worktrees, the folder is the worktree, so each branch's server gets its own name.

Apps like Next.js and Vite change the title as you navigate. The extension puts it back each time.

## Install

### 1. The extension

From the Chrome Web Store: *(link coming soon)*

Or load it from source:

1. Clone this repo.
2. Open `chrome://extensions` in Dia (or any Chromium browser).
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and pick the `extension/` folder.

### 2. The helper (optional, macOS)

The extension can't see which folder a server was started from, so a small local helper
looks it up. It needs `python3` and `git`, both included with the Xcode Command Line Tools.

```bash
./helper/install.sh
```

This copies the helper to `~/Library/Application Support/localhost-tab-titles/` and starts it
at login. Reload your localhost tabs afterwards.

To remove it:

```bash
./helper/uninstall.sh
```

On Linux the helper script works as-is (it needs `lsof`). Run `helper/tab-names.py` with
systemd or whatever process manager you like. The installer is macOS-only.

## How the helper works

`GET http://127.0.0.1:47123/?port=3000` returns `{"name": "my-app", "branch": "main"}`:

1. `lsof` finds the process listening on the port.
2. `lsof` finds that process's working directory.
3. `git rev-parse --show-toplevel` turns it into the repo or worktree folder name (if it isn't
   a git repo, the plain folder name is used).

If nothing resolves (Docker containers, SSH tunnels, a server started from `/`), the tab
falls back to `localhost:<port>`.

**Security:** the helper only listens on `127.0.0.1`, sends no CORS headers (so web pages
can't read its answers; only the extension can), and rejects any request whose `Host` header
isn't `127.0.0.1` or `localhost`, which blocks DNS-rebinding attacks.

## Privacy

Nothing leaves your machine. See [PRIVACY.md](PRIVACY.md).

## Development

```bash
python3 scripts/make-icons.py   # re-render the icons (standard library only)
./scripts/package.sh            # zip extension/ into dist/ for the Chrome Web Store
```

## License

[MIT](LICENSE)

Not affiliated with The Browser Company or Dia.
