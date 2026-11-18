import { defineConfig } from "@playwright/test";

/**
 * End-to-end tests run against a production build in local workerd (`vite preview`),
 * with CB_TEST_TIMERS=1 so rooms can use a short bidding window.
 * Set E2E_BASE_URL to point at an already-running server instead.
 */
const PORT = Number(process.env.E2E_PORT ?? 4173);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 6 * 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    // Uses the locally installed Chrome; set E2E_CHANNEL="" to use Playwright's bundled Chromium.
    channel: process.env.E2E_CHANNEL ?? "chrome",
    trace: "retain-on-failure",
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
        env: { CB_TEST_TIMERS: "1" },
        url: baseURL,
        reuseExistingServer: true,
        timeout: 240_000,
      },
});
