# Privacy Policy: Localhost Tab Titles

Localhost Tab Titles does not collect, transmit, or sell any data. It has no analytics, no
tracking, and no servers.

**What it reads**
- The URL of localhost pages only (`localhost`, `127.0.0.1`, `0.0.0.0`, `*.localhost`, `[::1]`),
  to get the port number. It changes nothing on those pages except the title.
- When you open the popup, the URL of the current tab, to show its port.

**What it sends, and where**
- The port number goes to the optional helper program on your own computer, through the
  browser's native messaging. The helper replies with a folder name and git branch, read
  from your local machine. Nothing goes over the network.

**What it stores**
- Your title format choice and any names you give to ports, in your browser's extension
  storage (`chrome.storage.sync`). If browser sync is on, your browser syncs these to your
  other devices the same way it syncs other extension settings. You can clear them by
  removing the extension.

Questions: open an issue at https://github.com/Jynx-hub/localhost-tab-titles/issues
