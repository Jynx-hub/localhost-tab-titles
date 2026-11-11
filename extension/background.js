// Resolves a port to a tab label: a name the user set > the native helper's answer > host:port.
import { DEFAULT_FORMAT, formatLabel } from "./format.js";

const HOST_NAME = "com.localhost_tab_titles.helper";
const CACHE_MS = 10_000;
const cache = new Map(); // port -> { info, at }

function askHelper(message) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendNativeMessage(HOST_NAME, message, (reply) => {
        const err = chrome.runtime.lastError;
        resolve(err ? { error: err.message } : { reply: reply || {} });
      });
    } catch (e) {
      resolve({ error: String(e?.message || e) });
    }
  });
}

/** "missing" | "forbidden" | "error" for a native messaging failure message. */
function classify(error) {
  if (/not found/i.test(error)) return "missing";
  if (/forbidden/i.test(error)) return "forbidden";
  return "error";
}

async function lookup(port) {
  const hit = cache.get(port);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit;
  const { reply, error } = await askHelper({ port });
  const entry = { info: reply?.name ? reply : null, error: error ? classify(error) : null, at: Date.now() };
  // Don't cache failures: the user may be installing the helper right now.
  if (!error) cache.set(port, entry);
  return entry;
}

async function resolve(port, host) {
  const { format, names } = await chrome.storage.sync.get({ format: DEFAULT_FORMAT, names: {} });
  const custom = names[port];
  if (custom) {
    return { label: formatLabel(format, { name: custom, branch: "" }, port), source: "custom", custom, info: null };
  }
  const { info, error } = await lookup(port);
  const label = formatLabel(format, info, port);
  return { label: label || host, source: label ? "helper" : "fallback", custom: null, info, helperError: error };
}

chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
  if (msg?.type === "resolve") {
    resolve(String(msg.port), String(msg.host)).then(respond);
    return true;
  }
  if (msg?.type === "status") {
    askHelper({ ping: true }).then(({ reply, error }) =>
      respond(error ? { installed: false, error: classify(error), detail: error } : { installed: !!reply?.ok }),
    );
    return true;
  }
});

// Format or names changed: tell every open tab to fetch its label again.
chrome.storage.onChanged.addListener(async () => {
  for (const tab of await chrome.tabs.query({})) {
    chrome.tabs.sendMessage(tab.id, { type: "refresh" }).catch(() => {});
  }
});
