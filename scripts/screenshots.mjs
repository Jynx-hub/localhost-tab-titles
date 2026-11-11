// Renders the popup (light + dark) and the 1280x800 Web Store screenshot into store/.
// Usage: node scripts/screenshots.mjs
import { chromium } from "@playwright/test";
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXT = path.join(ROOT, "extension");
const ID = "ipkpcfbbpicilgfambbgcihgeeodgmlo";
const OUT = path.join(ROOT, "store");
fs.mkdirSync(OUT, { recursive: true });

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ltt-shots-"));
const fixtures = spawn("python3", [path.join(ROOT, "tests/serve_fixtures.py")], {
  stdio: ["pipe", "pipe", "inherit"],
  env: { ...process.env, LTT_WORKTREE_PORT: "3001" },
});
const ports = await new Promise((r) => fixtures.stdout.once("data", (d) => r(JSON.parse(d))));
execFileSync("bash", [path.join(ROOT, "helper/install.sh")], {
  env: { ...process.env, LTT_INSTALL_DIR: path.join(tmp, "helper"), LTT_HOST_DIRS: path.join(tmp, "profile/NativeMessagingHosts") },
});

const ctx = await chromium.launchPersistentContext(path.join(tmp, "profile"), {
  channel: "chromium",
  deviceScaleFactor: 2,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
});

try {
  for (const scheme of ["light", "dark"]) {
    const page = await ctx.newPage();
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: 340, height: 600 });
    await page.goto(`chrome-extension://${ID}/popup.html?url=${encodeURIComponent(`http://localhost:${ports.worktree}/`)}`);
    await page.locator("#status-text", { hasText: "Helper connected" }).waitFor();
    const h = await page.evaluate(() => Math.ceil(document.body.getBoundingClientRect().height));
    await page.setViewportSize({ width: 340, height: h });
    await page.screenshot({ path: path.join(OUT, `popup-${scheme}.png`) });
    await page.close();
  }

  const popupB64 = fs.readFileSync(path.join(OUT, "popup-light.png")).toString("base64");
  const html = fs.readFileSync(path.join(ROOT, "store/mock.html"), "utf8").replace("{{POPUP}}", popupB64)
    .replace("{{ICON}}", fs.readFileSync(path.join(EXT, "icons/icon48.png")).toString("base64"));
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.setContent(html);
  await page.screenshot({ path: path.join(OUT, "screenshot-1280x800.png"), scale: "css" });
} finally {
  await ctx.close();
  fixtures.stdin.end();
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log("wrote store/popup-light.png, store/popup-dark.png, store/screenshot-1280x800.png");
