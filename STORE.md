# Chrome Web Store listing

**Name:** Localhost Tab Titles

**Summary (≤132 chars):**
Name localhost tabs after the project or git worktree serving them, plus the port, so dev servers are easy to tell apart.

**Category:** Developer Tools · **Language:** English

**Description:**

Running several dev servers and every tab says "Create Next App" or "Vite + React"?
Localhost Tab Titles names each localhost tab after the project serving it, plus the port:

  my-app · 3000
  my-app-checkout · 3001
  api · 8080

• Each git worktree gets its own name, so you can tell branches apart.
• Titles stay put even when Next.js, Vite, or your router changes them.
• Choose a format: folder · port, branch · port, port · folder, or folder (branch) · port.
• Name any port by hand from the popup, which is handy for Docker.
• Works on localhost, 127.0.0.1, 0.0.0.0, *.localhost and [::1], on any port.

Project and branch names come from a small, optional, open-source helper for macOS (a
one-line install shown in the popup). Without it, tabs show localhost:port, and names you
set by hand still work.

Made for Dia. Works in any Chromium browser. Open source (MIT):
https://github.com/Jynx-hub/localhost-tab-titles

**Screenshots:** `store/screenshot-1280x800.png`
**Icon:** `extension/icons/icon128.png`

## Privacy practices tab

**Single purpose:**
Rename localhost browser tabs to show which local project and port is serving them.

**Permission justifications:**
- `nativeMessaging`: talks to the optional local helper program that looks up which project folder and git branch is serving a localhost port. The helper runs on the user's machine; nothing is sent over the network.
- `storage`: saves the user's title format choice and the names they give to ports.
- `activeTab`: lets the popup read the current tab's URL, to show its port and let the user rename it. Only when the user clicks the toolbar button.
- Content script on `localhost`, `127.0.0.1`, `0.0.0.0`, `*.localhost`, `[::1]`: sets the tab title on local development pages. It runs on no other sites.

**Remote code:** No. All code is in the package.

**Data usage:** No user data collected. Certify all three disclosures.

**Privacy policy URL:** https://github.com/Jynx-hub/localhost-tab-titles/blob/main/PRIVACY.md
