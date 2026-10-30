// Iggy web gates: E2E, responsive (gate 4/4b), accessibility (gate 7) and,
// in production mode, cross-browser (gate 8). URL, routes and the start
// command come from iggy.config.json; breakpoints from e2e/breakpoints.json,
// which scripts/add-web-gates.sh generates from the gate definitions.
import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "node:fs";

const iggy = JSON.parse(readFileSync("iggy.config.json", "utf8"));
if (!iggy.web) throw new Error('iggy.config.json needs a "web" section: { "startCommand", "url", "routes" }');

const production = (process.env.IGGY_MODE ?? iggy.mode) === "production";
// Point at a preinstalled browser when the bundled one isn't downloaded.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }], ["json", { outputFile: "playwright-report/results.json" }]],
  use: { baseURL: iggy.web.url, trace: "retain-on-failure" },
  webServer: { command: iggy.web.startCommand, url: iggy.web.url, reuseExistingServer: !process.env.CI, timeout: 120_000 },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], launchOptions: { executablePath } } },
    ...(production
      ? [
          { name: "firefox", use: { ...devices["Desktop Firefox"] }, grepInvert: /@a11y/ },
          { name: "webkit", use: { ...devices["Desktop Safari"] }, grepInvert: /@a11y/ },
        ]
      : []),
  ],
});
