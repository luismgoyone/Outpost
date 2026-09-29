import "server-only";

import type { Repo } from "@/db/schema";
import { cached } from "@/lib/cache";

import { getInstallationOctokit } from "./app";
import {
  mapReleases,
  pullRequestNumbers,
  RELEASES_QUERY,
  type Release,
  type ReleaseChanges,
  type ReleasesQueryResult,
} from "./releases";

export type RepoRelease = { repo: Repo; release: Release; changes: ReleaseChanges | null };
type CachedRelease = { release: Release; changes: ReleaseChanges | null };

/**
 * One repo's releases, newest first. The `detailed` newest also get commits, contributors
 * and PRs since their previous tag (one compare call each).
 */
async function fetchRepoReleases(repo: Repo, perRepo = 10, detailed = 5): Promise<CachedRelease[]> {
  const octokit = await getInstallationOctokit(repo.installationId);
  const result = await octokit.graphql<ReleasesQueryResult>(RELEASES_QUERY, {
    owner: repo.owner,
    name: repo.name,
    count: perRepo,
  });
  const releases = mapReleases(result);

  return Promise.all(
    releases.map(async (release, index): Promise<CachedRelease> => {
      // Newest first, so the previous release is the next one in the list.
      const previous = releases[index + 1];
      if (!previous || index >= detailed) return { release, changes: null };
      try {
        const { data } = await octokit.rest.repos.compareCommitsWithBasehead({
          owner: repo.owner,
          repo: repo.name,
          basehead: `${previous.tagName}...${release.tagName}`,
          per_page: 100,
        });
        return {
          release,
          changes: {
            commits: data.total_commits,
            contributors: [
              ...new Set(data.commits.map((c) => c.author?.login).filter((l): l is string => !!l)),
            ],
            pullRequests: pullRequestNumbers(data.commits.map((c) => c.commit.message)),
            compareUrl: data.html_url,
            previousTag: previous.tagName,
          },
        };
      } catch {
        return { release, changes: null };
      }
    }),
  );
}

/** Releases for every connected repo (cached per repo), newest first across repos. */
export async function fetchAllReleases(repos: Repo[]) {
  const settled = await Promise.allSettled(
    repos.map((repo) => cached(repo, "releases", () => fetchRepoReleases(repo))),
  );
  const errors: Array<{ repo: Repo; message: string }> = [];
  const items: RepoRelease[] = settled.flatMap((outcome, i) => {
    const repo = repos[i];
    if (outcome.status === "rejected") {
      errors.push({ repo, message: String(outcome.reason?.message ?? outcome.reason) });
      return [];
    }
    return outcome.value.map((r) => ({ repo, ...r }));
  });
  items.sort((a, b) => b.release.publishedAt.localeCompare(a.release.publishedAt));
  return { items, errors };
}
