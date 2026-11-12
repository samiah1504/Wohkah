import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against the real app and a real Supabase stack
 * (`supabase start` in CI). Requires .env.local with the local Supabase URL
 * and keys; see .github/workflows/ci.yml and DEPLOYMENT.md.
 */
const port = Number(process.env.E2E_PORT ?? 3000);

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "off",
    screenshot: "only-on-failure",
    // Optional: use an already-installed Chromium instead of Playwright's own
    // download (e.g. E2E_CHROMIUM_PATH=/opt/pw-browsers/chromium). CI leaves it unset.
    ...(process.env.E2E_CHROMIUM_PATH
      ? { launchOptions: { executablePath: process.env.E2E_CHROMIUM_PATH } }
      : {}),
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm start --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
