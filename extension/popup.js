import { DEFAULT_FORMAT, FORMATS, parseLocalUrl } from "./format.js";

const $ = (id) => document.getElementById(id);
const send = (msg) => chrome.runtime.sendMessage(msg);

const SOURCE_TEXT = {
  helper: "Helper (git)",
  custom: "Your name",
  fallback: "Host and port only",
};

async function currentTarget() {
  // Tests open the popup as a normal page and pass the URL to inspect.
  const override = new URLSearchParams(location.search).get("url");
  if (override) return parseLocalUrl(override);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.url ? parseLocalUrl(tab.url) : null;
}

function renderDetails(res, target) {
  const rows = [];
  if (res.info?.name) rows.push(["Folder", res.info.name]);
  if (res.info?.branch) rows.push(["Branch", res.info.branch]);
  rows.push(["Port", target.port], ["Source", SOURCE_TEXT[res.source]]);
  $("details").replaceChildren(
    ...rows.flatMap(([k, v]) => {
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = k;
      dd.textContent = v;
      return [dt, dd];
    }),
  );
}

async function renderTab(target) {
  const res = await send({ type: "resolve", port: target.port, host: target.host });
  $("label").textContent = res.label;
  renderDetails(res, target);
  $("name").value = res.custom || "";
  $("name").placeholder = res.info?.name || target.host;
  $("reset").hidden = !res.custom;
}

async function saveName(target, value) {
  const { names } = await chrome.storage.sync.get({ names: {} });
  const name = value.trim();
  if (name) names[target.port] = name;
  else delete names[target.port];
  await chrome.storage.sync.set({ names });
  await renderTab(target);
}

async function renderHelper() {
  const s = await send({ type: "status" });
  const dot = $("dot");
  if (s.installed) {
    dot.className = "dot ok";
    $("status-text").textContent = "Helper connected";
    $("install").hidden = true;
    return;
  }
  $("install").hidden = false;
  if (s.error === "forbidden") {
    dot.className = "dot bad";
    $("status-text").textContent = "Helper doesn't allow this extension";
    $("install-why").textContent =
      "The helper was installed for a different build of this extension. Run the installer again to update it:";
  } else if (s.error === "missing") {
    dot.className = "dot warn";
    $("status-text").textContent = "Helper not installed";
  } else {
    dot.className = "dot bad";
    $("status-text").textContent = "Helper isn't responding";
    $("install-why").textContent = "Reinstalling usually fixes this. Paste this in Terminal:";
  }
}

async function init() {
  const { format } = await chrome.storage.sync.get({ format: DEFAULT_FORMAT });
  const select = $("format");
  for (const f of FORMATS) select.add(new Option(f.label, f.id, false, f.id === format));
  select.addEventListener("change", () => chrome.storage.sync.set({ format: select.value }));

  $("copy").addEventListener("click", async () => {
    await navigator.clipboard.writeText($("cmd").textContent);
    $("copy").textContent = "Copied";
    setTimeout(() => ($("copy").textContent = "Copy"), 1500);
  });

  const target = await currentTarget();
  $("not-local").hidden = !!target;
  $("local").hidden = !target;
  if (target) {
    $("port").textContent = target.port;
    const name = $("name");
    name.addEventListener("keydown", (e) => e.key === "Enter" && name.blur());
    name.addEventListener("change", () => saveName(target, name.value));
    $("reset").addEventListener("click", () => saveName(target, ""));
    chrome.storage.onChanged.addListener(() => renderTab(target));
    await renderTab(target);
  }
  await renderHelper();
}

init();
