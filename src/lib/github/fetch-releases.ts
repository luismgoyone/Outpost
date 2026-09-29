import "server-only";

import type { Repo } from "@/db/schema";

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

/**
 * Releases for every connected repo, newest first. The `detailed` newest releases also get
 * commits, contributors and PRs since their previous tag (one compare call each).
 */
export async function fetchAllReleases(repos: Repo[], { perRepo = 10, detailed = 12 } = {}) {
  const settled = await Promise.allSettled(
    repos.map(async (repo) => {
      const octokit = await getInstallationOctokit(repo.installationId);
      const result = await octokit.graphql<ReleasesQueryResult>(RELEASES_QUERY, {
        owner: repo.owner,
        name: repo.name,
        count: perRepo,
      });
      return { repo, octokit, releases: mapReleases(result) };
    }),
  );

  const errors: Array<{ repo: Repo; message: string }> = [];
  const perRepoReleases = settled.flatMap((outcome, i) => {
    if (outcome.status === "fulfilled") return [outcome.value];
    errors.push({ repo: repos[i], message: String(outcome.reason?.message ?? outcome.reason) });
    return [];
  });

  const all = perRepoReleases
    .flatMap(({ repo, octokit, releases }) =>
      releases.map((release, index) => ({
        repo,
        octokit,
        release,
        // Releases are newest first, so the previous release is the next one in the list.
        previous: releases[index + 1] ?? null,
      })),
    )
    .sort((a, b) => b.release.publishedAt.localeCompare(a.release.publishedAt));

  const items: RepoRelease[] = await Promise.all(
    all.map(async ({ repo, octokit, release, previous }, index) => {
      if (!previous || index >= detailed) return { repo, release, changes: null };
      try {
        const { data } = await octokit.rest.repos.compareCommitsWithBasehead({
          owner: repo.owner,
          repo: repo.name,
          basehead: `${previous.tagName}...${release.tagName}`,
          per_page: 100,
        });
        const contributors = [
          ...new Set(data.commits.map((c) => c.author?.login).filter((l): l is string => !!l)),
        ];
        return {
          repo,
          release,
          changes: {
            commits: data.total_commits,
            contributors,
            pullRequests: pullRequestNumbers(data.commits.map((c) => c.commit.message)),
            compareUrl: data.html_url,
            previousTag: previous.tagName,
          },
        };
      } catch {
        return { repo, release, changes: null };
      }
    }),
  );

  return { items, errors };
}
