import "server-only";

import { App, Octokit } from "octokit";

import { requireEnv } from "@/lib/env";

let cached: { key: string; app: App } | undefined;

/**
 * Octokit's throttling plugin queues every POST, including read-only GraphQL queries, one per
 * second (GitHub asks for that spacing on *mutations*). Outpost never mutates, so reads across
 * many repos run in parallel instead of ~1s each. Rate-limit retries still apply.
 */
const unthrottledWrites = { key: () => ({ schedule: <T>(_: unknown, job: () => T) => job() }) };

const throttle = {
  write: unthrottledWrites,
  // Retry once after a rate limit, then surface the error (shown per repo in the UI).
  onRateLimit: (_retryAfter: number, _options: unknown, _octokit: unknown, retryCount: number) =>
    retryCount < 1,
  onSecondaryRateLimit: (
    _retryAfter: number,
    _options: unknown,
    _octokit: unknown,
    retryCount: number,
  ) => retryCount < 1,
};

/**
 * GitHub App client, one per process. Reusing it lets Octokit cache installation tokens
 * (valid ~1h) instead of minting a new one per request, which the throttling plugin spaces
 * ~1s apart. Accepts a PEM with real or escaped (\n) newlines. GITHUB_API_URL is optional:
 * GitHub Enterprise, or the mock API in e2e tests.
 */
export function getGitHubApp(): App {
  const appId = requireEnv("GITHUB_APP_ID");
  const privateKey = requireEnv("GITHUB_APP_PRIVATE_KEY").replace(/\\n/g, "\n");
  const baseUrl = process.env.GITHUB_API_URL || "https://api.github.com";
  const key = `${appId}|${baseUrl}|${privateKey}`;
  if (cached?.key !== key) {
    cached = {
      key,
      app: new App({
        appId,
        privateKey,
        // Cast: the plugin types `write` as a Bottleneck group; it only calls key().schedule().
        Octokit: Octokit.defaults({ baseUrl, throttle: throttle as never }),
      }),
    };
  }
  return cached.app;
}

/** Octokit scoped to one installation; exposes both `.graphql` and `.rest`. */
export function getInstallationOctokit(installationId: number) {
  return getGitHubApp().getInstallationOctokit(installationId);
}

/** Where the owner goes to install the App on more repos. */
export function getInstallUrl(): string {
  return `https://github.com/apps/${requireEnv("GITHUB_APP_SLUG")}/installations/new`;
}
