import { defineConfig, devices } from "@playwright/test";

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  reporter: [
    ["list"],
    ["json", { outputFile: "artifacts/browser-results.json" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:3010",
    trace: "retain-on-failure",
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 900 },
      },
    },
  ],
  // Test the actual production build, not a legacy wrapper or a test-only app route.
  webServer: [
    {
      command: "bun scripts/mock-supabase.ts",
      url: "http://127.0.0.1:54329/__audit",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "bun scripts/start-test.ts",
      url: "http://127.0.0.1:3010",
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
