import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  outputDir: "output/playwright/results",
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  webServer: {
    command:
      "env DATABASE_URL=file:./e2e.db tsx scripts/reset-db.ts && env DATABASE_URL=file:./e2e.db pnpm db:push && env DATABASE_URL=file:./e2e.db pnpm build && env DATABASE_URL=file:./e2e.db PORT=3100 pnpm start",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
