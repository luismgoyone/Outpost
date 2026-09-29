import "server-only";

import { App, Octokit } from "octokit";

import { requireEnv } from "@/lib/env";

/**
 * GitHub App client. Accepts a PEM with real or escaped (\n) newlines.
 * GITHUB_API_URL is optional: GitHub Enterprise, or the mock API in e2e tests.
 */
export function getGitHubApp() {
  const baseUrl = process.env.GITHUB_API_URL || "https://api.github.com";
  return new App({
    appId: requireEnv("GITHUB_APP_ID"),
    privateKey: requireEnv("GITHUB_APP_PRIVATE_KEY").replace(/\\n/g, "\n"),
    Octokit: Octokit.defaults({ baseUrl }),
  });
}

/** Octokit scoped to one installation; exposes both `.graphql` and `.rest`. */
export function getInstallationOctokit(installationId: number) {
  return getGitHubApp().getInstallationOctokit(installationId);
}

/** Where the owner goes to install the App on more repos. */
export function getInstallUrl(): string {
  return `https://github.com/apps/${requireEnv("GITHUB_APP_SLUG")}/installations/new`;
}
