import { defineConfig, devices } from "@playwright/test";

const PORT = 4010;

export default defineConfig({
  testDir: "test/e2e",
  globalSetup: "./test/e2e/global-setup.js",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}/conf/`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `node test/support/serve.js ${PORT}`,
    url: `http://127.0.0.1:${PORT}/conf/`,
    reuseExistingServer: !process.env.CI,
  },
});
