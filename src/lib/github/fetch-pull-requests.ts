import "server-only";

import type { RepoRef } from "@/lib/repos";

import { getInstallationOctokit } from "./app";
import {
  mapPullRequests,
  PULL_REQUESTS_QUERY,
  type PullRequestsQueryResult,
  type RepoPullRequests,
} from "./pull-requests";

export async function fetchPullRequests(repo: RepoRef): Promise<RepoPullRequests> {
  const octokit = await getInstallationOctokit(repo.installationId);
  const result = await octokit.graphql<PullRequestsQueryResult>(PULL_REQUESTS_QUERY, {
    owner: repo.owner,
    name: repo.name,
    openCount: 50,
    mergedCount: 20,
  });
  return mapPullRequests(result);
}
