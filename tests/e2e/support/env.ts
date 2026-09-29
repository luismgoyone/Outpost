/** Fixed values shared by the Playwright config, global setup and tests. */
export const E2E = {
  appPort: Number(process.env.PORT ?? 3100),
  mockGitHubPort: 4010,
  databaseUrl:
    process.env.E2E_DATABASE_URL ?? "postgres://postgres:postgres@localhost:54329/outpost_e2e",
  authSecret: "e2e-only-secret-not-used-anywhere-else-0123456789",
  ownerLogin: "e2e-owner",
} as const;

export const appUrl = `http://localhost:${E2E.appPort}`;
export const mockGitHubUrl = `http://localhost:${E2E.mockGitHubPort}`;
