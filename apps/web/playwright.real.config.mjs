import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
export default defineConfig({
  testDir: resolve(import.meta.dirname, "../../tests/browser-real"),
  testMatch: "demo.spec.ts",
  workers: 1,
  timeout: 240_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env.TRAVESSIA_WEB_TEST_URL,
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  reporter: "list",
  outputDir: resolve(import.meta.dirname, "../../test-results/real"),
});
