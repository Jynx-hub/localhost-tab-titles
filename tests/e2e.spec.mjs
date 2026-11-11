// End-to-end: real Chromium + the unpacked extension + the real native helper (installed by install.sh).
import { test, expect, chromium } from "@playwright/test";
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXTENSION = path.join(ROOT, "extension");
const EXTENSION_ID = "ipkpcfbbpicilgfambbgcihgeeodgmlo";
const HOST_FILE = "com.localhost_tab_titles.helper.json";

test.describe.configure({ mode: "serial" });

// Chromium reads native hosts from <user data dir>/NativeMessagingHosts (Dia: "Dia/User Data/..."),
// so everything lives in a temp dir and nothing touches the real browser profiles.
let ctx, ports, fixtures, tmp, HOST_DIR, HOST_PATH;

const titleOf = async (url) => {
  const page = await ctx.newPage();
  await page.goto(url);
  return page;
};
const popup = async (pageUrl) => {
  const page = await ctx.newPage();
  await page.goto(`chrome-extension://${EXTENSION_ID}/popup.html?url=${encodeURIComponent(pageUrl)}`);
  return page;
};
const expectTitle = (page, title) => expect.poll(() => page.title(), { timeout: 5000 }).toBe(title);

function installHelper() {
  execFileSync("bash", [path.join(ROOT, "helper/install.sh")], {
    env: { ...process.env, LTT_INSTALL_DIR: path.join(tmp, "helper install"), LTT_HOST_DIRS: HOST_DIR },
    stdio: "pipe",
  });
}

test.beforeAll(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ltt-e2e-"));
  HOST_DIR = path.join(tmp, "profile", "NativeMessagingHosts");
  HOST_PATH = path.join(HOST_DIR, HOST_FILE);

  fixtures = spawn("python3", [path.join(ROOT, "tests/serve_fixtures.py")], { stdio: ["pipe", "pipe", "inherit"] });
  ports = await new Promise((resolve, reject) => {
    fixtures.stdout.once("data", (d) => resolve(JSON.parse(d)));
    fixtures.once("exit", (code) => reject(new Error(`fixtures exited ${code}`)));
  });

  installHelper();
  ctx = await chromium.launchPersistentContext(path.join(tmp, "profile"), {
    channel: "chromium",
    args: [`--disable-extensions-except=${EXTENSION}`, `--load-extension=${EXTENSION}`],
  });
});

test.afterAll(async () => {
  await ctx?.close();
  fixtures?.stdin.end();
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("extension loads with the fixed ID the helper allows", async () => {
  const worker = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent("serviceworker"));
  expect(new URL(worker.url()).host).toBe(EXTENSION_ID);
});

test("worktree tab is named after the worktree folder and port", async () => {
  const page = await titleOf(`http://localhost:${ports.worktree}/`);
  await expectTitle(page, `demo-app-feature · ${ports.worktree}`);
});

test("title is restored after the app changes it", async () => {
  const page = await titleOf(`http://localhost:${ports.repo}/`);
  await expectTitle(page, `demo-app · ${ports.repo}`);
  await page.waitForTimeout(600); // the page renames itself at 300ms
  await expectTitle(page, `demo-app · ${ports.repo}`);
  await page.evaluate(() => (document.title = "Changed by router"));
  await expectTitle(page, `demo-app · ${ports.repo}`);
});

test("non-git folder uses the folder name", async () => {
  const page = await titleOf(`http://localhost:${ports.plain}/`);
  await expectTitle(page, `plain-site · ${ports.plain}`);
});

test("127.0.0.1 and *.localhost hosts work", async () => {
  const a = await titleOf(`http://127.0.0.1:${ports.repo}/`);
  await expectTitle(a, `demo-app · ${ports.repo}`);
  const b = await titleOf(`http://app.localhost:${ports.repo}/`);
  await expectTitle(b, `demo-app · ${ports.repo}`);
});

test("popup shows the tab and a connected helper", async () => {
  const url = `http://localhost:${ports.worktree}/`;
  const p = await popup(url);
  await expect(p.locator("#label")).toHaveText(`demo-app-feature · ${ports.worktree}`);
  await expect(p.locator("#details")).toContainText("feature-x");
  await expect(p.locator("#status-text")).toHaveText("Helper connected");
  await expect(p.locator("#install")).toBeHidden();
});

test("popup on a non-localhost page explains itself", async () => {
  const p = await popup("https://example.com/");
  await expect(p.locator("#not-local")).toBeVisible();
  await expect(p.locator("#local")).toBeHidden();
});

test("changing the format updates open tabs live", async () => {
  const tab = await titleOf(`http://localhost:${ports.worktree}/`);
  await expectTitle(tab, `demo-app-feature · ${ports.worktree}`);
  const p = await popup(`http://localhost:${ports.worktree}/`);

  await p.selectOption("#format", "branch");
  await expectTitle(tab, `feature-x · ${ports.worktree}`);
  await p.selectOption("#format", "both");
  await expectTitle(tab, `demo-app-feature (feature-x) · ${ports.worktree}`);
  await p.selectOption("#format", "port-first");
  await expectTitle(tab, `${ports.worktree} · demo-app-feature`);
  await p.selectOption("#format", "folder");
  await expectTitle(tab, `demo-app-feature · ${ports.worktree}`);
});

test("renaming a port from the popup updates the tab, reset undoes it", async () => {
  const tab = await titleOf(`http://localhost:${ports.plain}/`);
  await expectTitle(tab, `plain-site · ${ports.plain}`);
  const p = await popup(`http://localhost:${ports.plain}/`);

  await p.fill("#name", "api");
  await p.press("#name", "Enter");
  await expectTitle(tab, `api · ${ports.plain}`);
  await expect(p.locator("#label")).toHaveText(`api · ${ports.plain}`);
  await expect(p.locator("#reset")).toBeVisible();

  // A second tab on the same port gets the name too.
  const other = await titleOf(`http://127.0.0.1:${ports.plain}/`);
  await expectTitle(other, `api · ${ports.plain}`);

  await p.click("#reset");
  await expectTitle(tab, `plain-site · ${ports.plain}`);
  await expect(p.locator("#reset")).toBeHidden();
});

test("helper for another extension build is reported", async () => {
  const good = fs.readFileSync(HOST_PATH, "utf8");
  const m = JSON.parse(good);
  m.allowed_origins = ["chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/"];
  fs.writeFileSync(HOST_PATH, JSON.stringify(m));
  try {
    const p = await popup(`http://localhost:${ports.repo}/`);
    await expect(p.locator("#status-text")).toHaveText("Helper doesn't allow this extension");
    await expect(p.locator("#install")).toBeVisible();
  } finally {
    fs.writeFileSync(HOST_PATH, good);
  }
});

test("without the helper, tabs fall back to host:port and the popup shows the installer", async () => {
  fs.rmSync(HOST_PATH);
  try {
    const tab = await titleOf(`http://localhost:${ports.late}/`);
    await page_wait(tab);
    await expectTitle(tab, `localhost:${ports.late}`);

    const p = await popup(`http://localhost:${ports.late}/`);
    await expect(p.locator("#status-text")).toHaveText("Helper not installed");
    await expect(p.locator("#install")).toBeVisible();
    await expect(p.locator("#cmd")).toContainText("helper/install.sh | bash");

    // A name set by hand still works with no helper at all.
    await p.fill("#name", "docker-api");
    await p.press("#name", "Enter");
    await expectTitle(tab, `docker-api · ${ports.late}`);
    await p.click("#reset");
    await expectTitle(tab, `localhost:${ports.late}`);
  } finally {
    installHelper();
  }
});

test("installing the helper later takes effect without reinstalling the extension", async () => {
  const tab = await titleOf(`http://localhost:${ports.late}/`);
  await expectTitle(tab, `late-site · ${ports.late}`);
});

async function page_wait(page) {
  await page.waitForLoadState("load");
  await page.waitForTimeout(500);
}
