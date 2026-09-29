import { App } from "octokit";

import { requireEnv } from "@/lib/env";

/** GitHub App client. Accepts a PEM with real or escaped (\n) newlines. */
export function getGitHubApp(): App {
  return new App({
    appId: requireEnv("GITHUB_APP_ID"),
    privateKey: requireEnv("GITHUB_APP_PRIVATE_KEY").replace(/\\n/g, "\n"),
  });
}

/** Octokit scoped to one installation; exposes both `.graphql` and `.rest`. */
export function getInstallationOctokit(installationId: number) {
  return getGitHubApp().getInstallationOctokit(installationId);
}
