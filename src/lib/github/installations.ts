import "server-only";

import type { RepoRef } from "@/lib/repos";

import { getGitHubApp } from "./app";

export type InstallableRepo = RepoRef & { fullName: string; isPrivate: boolean };

/** Every repo the App can currently see, across all of its installations. */
export async function listInstallableRepos(): Promise<InstallableRepo[]> {
  const app = getGitHubApp();
  const result: InstallableRepo[] = [];

  for await (const { installation } of app.eachInstallation.iterator()) {
    const octokit = await app.getInstallationOctokit(installation.id);
    const repositories = await octokit.paginate("GET /installation/repositories", {
      per_page: 100,
    });
    for (const repo of repositories) {
      result.push({
        installationId: installation.id,
        owner: repo.owner.login,
        name: repo.name,
        fullName: repo.full_name,
        isPrivate: repo.private,
      });
    }
  }

  return result.sort((a, b) => a.fullName.localeCompare(b.fullName));
}
