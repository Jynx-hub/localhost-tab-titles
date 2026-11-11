// Pin the tab title to a label like "my-app · 3000" so dev servers are told apart at a glance.
// The service worker picks the label; until it answers (or if it can't), the title is host:port.
(() => {
  const port = location.port || (location.protocol === "https:" ? "443" : "80");
  let label = location.host;

  function pin() {
    if (document.title !== label) document.title = label;
  }

  function refresh() {
    try {
      chrome.runtime.sendMessage({ type: "resolve", port, host: location.host }, (res) => {
        if (chrome.runtime.lastError || !res?.label) return;
        label = res.label;
        pin();
      });
    } catch {
      // Extension was reloaded or removed; this old content script can no longer reach it.
    }
  }

  pin();
  // Apps (Next.js, Vite, etc.) rewrite <title> on load and client-side navigation; put it back each time.
  new MutationObserver(pin).observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
  });

  refresh();
  // Coming back to the tab picks up branch switches; settings changes arrive as "refresh".
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && refresh());
  chrome.runtime.onMessage.addListener((msg) => msg?.type === "refresh" && refresh());
})();
