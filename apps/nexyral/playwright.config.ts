import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
export default defineConfig({
  testDir: "./tests",
  timeout: 60000,
  expect: { timeout: 10000 },
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4174",
    launchOptions: {
      executablePath:
        process.env.NEXYRAL_CHROMIUM_PATH ||
        (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
    },
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node server/index.ts",
      url: "http://127.0.0.1:8790/api/health",
      reuseExistingServer: !process.env.CI,
      env: {
        NEXYRAL_API_PORT: "8790",
        NEXYRAL_PREVIEW_ORIGIN: "http://127.0.0.2:8791",
        NEXYRAL_DB_PATH: ".data/e2e.sqlite",
        NEXYRAL_APP_ORIGINS: "http://127.0.0.1:4174,http://localhost:4174",
      },
    },
    {
      command: "node server/preview-entry.ts",
      url: "http://127.0.0.2:8791/_health",
      reuseExistingServer: !process.env.CI,
      env: { NEXYRAL_PREVIEW_ORIGIN: "http://127.0.0.2:8791", NEXYRAL_DB_PATH: ".data/e2e.sqlite", NEXYRAL_APP_ORIGINS: "http://127.0.0.1:4174,http://localhost:4174" },
    },
    {
      command: "npm run preview -- --host 0.0.0.0 --port 4174",
      url: "http://127.0.0.1:4174",
      reuseExistingServer: !process.env.CI,
      env: { NEXYRAL_API_PORT: "8790" },
    },
  ],
});
