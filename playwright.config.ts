import { generateKeyPairSync } from "node:crypto";

import { defineConfig, devices } from "@playwright/test";

import { appUrl, E2E, mockGitHubUrl } from "./tests/e2e/support/env";

// A throwaway key so the GitHub App client can sign JWTs for the mock API.
const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs1", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

/** The app under test talks only to the mock GitHub API and the e2e database. */
const appEnv = {
  PORT: String(E2E.appPort),
  DATABASE_URL: E2E.databaseUrl,
  GITHUB_API_URL: mockGitHubUrl,
  GITHUB_APP_ID: "1",
  GITHUB_APP_PRIVATE_KEY: privateKey,
  GITHUB_APP_SLUG: "outpost-e2e",
  AUTH_SECRET: E2E.authSecret,
  AUTH_TRUST_HOST: "true",
  AUTH_GITHUB_ID: "e2e",
  AUTH_GITHUB_SECRET: "e2e",
  OWNER_GITHUB_LOGIN: E2E.ownerLogin,
};

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/support/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : "list",
  use: {
    baseURL: appUrl,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node tests/e2e/support/mock-github.mts",
      url: `${mockGitHubUrl}/health`,
      env: { MOCK_GITHUB_PORT: String(E2E.mockGitHubPort) },
      reuseExistingServer: false,
    },
    {
      // CI runs the production build; locally the dev server is faster.
      command: process.env.CI
        ? `pnpm start --port ${E2E.appPort}`
        : `pnpm dev --port ${E2E.appPort}`,
      url: appUrl,
      env: appEnv,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
