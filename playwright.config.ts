import { defineConfig, devices } from "@playwright/test";

const PORT = 3210;
// PW_CHROME=1 uses the locally installed Google Chrome instead of Playwright's bundled browser.
const channel = process.env.PW_CHROME ? { channel: "chrome" as const } : {};

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], ...channel } },
    { name: "mobile", use: { ...devices["Pixel 7"], ...channel } },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    env: { SATSCOPE_SAMPLE_DATA: "1", SATSCOPE_VISITOR_LIMIT: "100000", NEXT_TELEMETRY_DISABLED: "1" },
  },
});
