import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  testMatch: "*.spec.mjs",
  workers: 1,
  fullyParallel: false,
  timeout: 30_000,
  reporter: [["list"]],
});
