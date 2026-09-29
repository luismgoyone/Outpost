import "server-only";

import type { Repo } from "@/db/schema";
import { cached } from "@/lib/cache";

import { getInstallationOctokit } from "./app";
import {
  DEPLOYMENTS_QUERY,
  isPermissionError,
  mapDeployments,
  type Deployment,
  type DeploymentsQueryResult,
} from "./deployments";

export type RepoDeployments = { repo: Repo; deployments: Deployment[] };

/**
 * Deployments for every connected repo, in parallel. Kept out of the PR query so a missing
 * Deployments permission can't break the other screens.
 */
export async function fetchAllDeployments(repos: Repo[]) {
  const settled = await Promise.allSettled(
    repos.map((repo) =>
      cached(repo, "deployments", async () => {
        const octokit = await getInstallationOctokit(repo.installationId);
        const result = await octokit.graphql<DeploymentsQueryResult>(DEPLOYMENTS_QUERY, {
          owner: repo.owner,
          name: repo.name,
          count: 30,
        });
        return mapDeployments(result);
      }),
    ),
  );

  const results: RepoDeployments[] = [];
  const errors: Array<{ repo: Repo; message: string }> = [];
  settled.forEach((outcome, i) => {
    if (outcome.status === "fulfilled")
      results.push({ repo: repos[i], deployments: outcome.value });
    else
      errors.push({ repo: repos[i], message: String(outcome.reason?.message ?? outcome.reason) });
  });

  return {
    results,
    errors,
    /** Every failure was a permission error: the App needs "Deployments: read". */
    permissionMissing: errors.length > 0 && errors.every((e) => isPermissionError(e.message)),
  };
}
