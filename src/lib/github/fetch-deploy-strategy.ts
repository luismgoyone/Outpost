import "server-only";

import type { Repo } from "@/db/schema";
import { cached } from "@/lib/cache";

import { getInstallationOctokit } from "./app";
import {
  detectStrategy,
  parseWorkflow,
  STRATEGIES,
  type DetectedStrategy,
  type Strategy,
  type Unreleased,
  type WorkflowFile,
} from "./deploy-strategy";
import { fetchAllDeployments } from "./fetch-deployments";
import { loadPullRequests } from "./fetch-pull-requests";
import { pullRequestNumbers } from "./releases";

export type Shipping = DetectedStrategy & {
  /** The owner overrode the detected strategy. */
  overridden: boolean;
  detected: DetectedStrategy;
  defaultBranch: string | null;
  /** For tag-based repos: what's merged but not released yet. */
  unreleased: Unreleased | null;
};

type CachedShipping = {
  detected: DetectedStrategy;
  defaultBranch: string | null;
  unreleased: Unreleased | null;
};

async function readWorkflows(repo: Repo): Promise<WorkflowFile[]> {
  const octokit = await getInstallationOctokit(repo.installationId);
  let entries: Array<{ name: string; path: string; type: string }>;
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: repo.owner,
      repo: repo.name,
      path: ".github/workflows",
    });
    entries = Array.isArray(data) ? data : [];
  } catch (error) {
    if ((error as { status?: number }).status === 404) return [];
    throw error;
  }
  const files = await Promise.all(
    entries
      .filter((e) => e.type === "file" && /\.ya?ml$/.test(e.name))
      .map(async (e) => {
        const { data } = await octokit.rest.repos.getContent({
          owner: repo.owner,
          repo: repo.name,
          path: e.path,
        });
        if (Array.isArray(data) || !("content" in data)) return null;
        return parseWorkflow(e.path, Buffer.from(data.content, "base64").toString("utf8"));
      }),
  );
  return files.filter((f): f is WorkflowFile => f !== null);
}

async function unreleasedSince(
  repo: Repo,
  tag: string,
  branch: string,
): Promise<Unreleased | null> {
  const octokit = await getInstallationOctokit(repo.installationId);
  try {
    const { data } = await octokit.rest.repos.compareCommitsWithBasehead({
      owner: repo.owner,
      repo: repo.name,
      basehead: `${tag}...${branch}`,
      per_page: 100,
    });
    return {
      sinceTag: tag,
      commits: data.ahead_by ?? data.total_commits ?? data.commits.length,
      pullRequests: pullRequestNumbers(data.commits.map((c) => c.commit.message)),
      compareUrl: data.html_url,
    };
  } catch {
    return null;
  }
}

async function detect(repo: Repo): Promise<CachedShipping> {
  const [pulls, workflows, deployments] = await Promise.all([
    loadPullRequests(repo),
    readWorkflows(repo),
    fetchAllDeployments([repo]).then((r) => r.results[0]?.deployments ?? []),
  ]);
  const defaultBranch = pulls.defaultBranch?.name ?? null;
  const detected = detectStrategy({
    workflows,
    defaultBranch: defaultBranch ?? "main",
    deployments,
  });
  const tag = pulls.meta.latestRelease?.tagName;
  return {
    detected,
    defaultBranch,
    unreleased: tag && defaultBranch ? await unreleasedSince(repo, tag, defaultBranch) : null,
  };
}

function isStrategy(value: string | null): value is Exclude<Strategy, "unknown"> {
  return STRATEGIES.includes(value as (typeof STRATEGIES)[number]);
}

/** How a repo ships, with the owner's override applied on top of detection. */
export async function loadShipping(repo: Repo): Promise<Shipping> {
  const { detected, defaultBranch, unreleased } = await cached(repo, "shipping", () =>
    detect(repo),
  );
  const override = isStrategy(repo.deployStrategy) ? repo.deployStrategy : null;
  const effective: DetectedStrategy = override
    ? { strategy: override, platform: detected.platform, reason: "Set by you" }
    : detected;
  return {
    ...effective,
    overridden: override !== null,
    detected,
    defaultBranch,
    // "Unreleased" only matters when releases are what ship.
    unreleased: effective.strategy === "tag" ? unreleased : null,
  };
}

export async function loadAllShipping(repos: Repo[]): Promise<Map<string, Shipping>> {
  const settled = await Promise.allSettled(repos.map((repo) => loadShipping(repo)));
  const map = new Map<string, Shipping>();
  settled.forEach((outcome, i) => {
    if (outcome.status === "fulfilled") map.set(repos[i].id, outcome.value);
  });
  return map;
}
