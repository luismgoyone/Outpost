import "server-only";

import type { Repo } from "@/db/schema";

import { loadPullRequests } from "./fetch-pull-requests";
import type { RepoPullRequests } from "./pull-requests";

export type RepoFetchError = { repo: Repo; message: string };

/**
 * Fetch PRs for every connected repo in parallel. One failing repo (revoked access,
 * rate limit) doesn't take down the page; it's reported alongside the results.
 */
export async function fetchAllPullRequests(repos: Repo[]): Promise<{
  results: Array<{ repo: Repo } & RepoPullRequests>;
  errors: RepoFetchError[];
}> {
  const settled = await Promise.allSettled(repos.map((repo) => loadPullRequests(repo)));
  const results: Array<{ repo: Repo } & RepoPullRequests> = [];
  const errors: RepoFetchError[] = [];
  settled.forEach((outcome, i) => {
    const repo = repos[i];
    if (outcome.status === "fulfilled") results.push({ repo, ...outcome.value });
    else errors.push({ repo, message: String(outcome.reason?.message ?? outcome.reason) });
  });
  return { results, errors };
}
