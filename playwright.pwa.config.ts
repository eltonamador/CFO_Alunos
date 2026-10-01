import { defineConfig, devices } from "@playwright/test";

/** Requires a production build. Uses only anonymous local pages, no real accounts. */
export default defineConfig({
  testDir: "./tests/pwa",
  testMatch: "**/*.pw.ts",
  workers: 1,
  timeout: 60_000,
  reporter: "list",
  use: { ...devices["Pixel 7"], baseURL: "http://localhost:3150", serviceWorkers: "allow" },
  webServer: {
    command: "pnpm exec next start -p 3150",
    url: "http://localhost:3150/login",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
