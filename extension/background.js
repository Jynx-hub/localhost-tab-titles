// Asks the optional local helper which project is serving a port.
// Content scripts can't read the helper (it sends no CORS headers); the worker can via host_permissions.
const HELPER = "http://127.0.0.1:47123";

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  fetch(`${HELPER}/?port=${encodeURIComponent(msg.port)}`)
    .then((r) => (r.ok ? r.json() : null))
    .then(reply, () => reply(null));
  return true;
});
