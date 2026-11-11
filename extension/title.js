// Pin the tab title to "<project> · <port>" so dev servers are told apart at a glance.
// Without the helper (or for a port that isn't a git project) it falls back to host:port.
const port = location.port || (location.protocol === "https:" ? "443" : "80");
let label = location.host;

function pin() {
  if (document.title !== label) document.title = label;
}

pin();
// Apps (Next.js, Vite, etc.) rewrite <title> on load and client-side navigation; put it back each time.
new MutationObserver(pin).observe(document.documentElement, {
  subtree: true,
  childList: true,
  characterData: true,
});

chrome.runtime.sendMessage({ port }, (info) => {
  if (chrome.runtime.lastError || !info?.name) return;
  label = `${info.name} · ${port}`;
  pin();
});
