import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173", ...devices["Desktop Chrome"] },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : { command: "npm run dev", port: 5173, reuseExistingServer: true },
});
