import { test } from "node:test";
import assert from "node:assert/strict";
import { formatLabel, parseLocalUrl } from "../extension/format.js";

const wt = { name: "app-feature", branch: "feature-x" };

test("formats", () => {
  assert.equal(formatLabel("folder", wt, "3001"), "app-feature · 3001");
  assert.equal(formatLabel("branch", wt, "3001"), "feature-x · 3001");
  assert.equal(formatLabel("port-first", wt, "3001"), "3001 · app-feature");
  assert.equal(formatLabel("both", wt, "3001"), "app-feature (feature-x) · 3001");
  assert.equal(formatLabel("unknown-id", wt, "3001"), "app-feature · 3001");
});

test("missing branch falls back to the folder", () => {
  const plain = { name: "site", branch: "" };
  assert.equal(formatLabel("branch", plain, "80"), "site · 80");
  assert.equal(formatLabel("both", plain, "80"), "site · 80");
  assert.equal(formatLabel("both", { name: "main", branch: "main" }, "80"), "main · 80");
});

test("no name means no label", () => {
  assert.equal(formatLabel("folder", null, "80"), null);
  assert.equal(formatLabel("folder", {}, "80"), null);
});

test("parseLocalUrl", () => {
  assert.deepEqual(parseLocalUrl("http://localhost:3000/x"), { host: "localhost:3000", port: "3000" });
  assert.deepEqual(parseLocalUrl("http://127.0.0.1/"), { host: "127.0.0.1", port: "80" });
  assert.deepEqual(parseLocalUrl("https://localhost/"), { host: "localhost", port: "443" });
  assert.deepEqual(parseLocalUrl("http://app.localhost:5173/"), { host: "app.localhost:5173", port: "5173" });
  assert.deepEqual(parseLocalUrl("http://[::1]:8080/"), { host: "[::1]:8080", port: "8080" });
  assert.equal(parseLocalUrl("https://example.com/"), null);
  assert.equal(parseLocalUrl("http://localhost.evil.com/"), null);
  assert.equal(parseLocalUrl("chrome://extensions"), null);
  assert.equal(parseLocalUrl("not a url"), null);
});
