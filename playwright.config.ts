import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against the local stack seeded with `npm run seed:dev`.
 * They create real sales / receipts in the LOCAL database only.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  // `next dev` compiles each route on its first visit (the first login after a
  // server start takes ~13s), so the default 5s assertion timeout is too tight.
  expect: { timeout: 20_000 },
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    locale: "he-IL",
    timezoneId: "Asia/Jerusalem",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, grepInvert: /@mobile/ },
    { name: "phone", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  webServer: {
    // CI tests the real production build; locally we reuse/start the dev server.
    command: process.env.CI ? "npm run build && npm run start" : "npm run dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
