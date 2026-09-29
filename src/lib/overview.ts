/** Attention cards and repo health for the Overview screen. Pure and unit-tested. */
import type { Repo } from "@/db/schema";
import {
  daysSince,
  isStale,
  type PullRequest,
  type RepoPullRequests,
} from "@/lib/github/pull-requests";
import { mergeRate, prsPerWeek, type WeekBucket } from "@/lib/stats";

export type RepoOverview = {
  repo: Repo;
  data: RepoPullRequests;
  openCount: number;
  staleCount: number;
  failingPrCount: number;
  weekly: WeekBucket[];
  mergeRate: number | null;
  /** Higher = needs attention sooner. */
  attentionScore: number;
};

export type AttentionItem = { repoId: string; label: string; detail: string };
export type AttentionCard = { count: number; items: AttentionItem[] };

export type Overview = {
  repos: RepoOverview[];
  stale: AttentionCard;
  failingCi: AttentionCard;
  waitingForReview: AttentionCard & { avgWaitDays: number | null };
};

export function buildOverview(
  snapshots: Array<{ repo: Repo; data: RepoPullRequests }>,
  now: Date,
): Overview {
  const repos = snapshots
    .map(({ repo, data }): RepoOverview => {
      const staleCount = data.open.filter((pr) => isStale(pr, now)).length;
      const failingPrCount = data.open.filter((pr) => pr.ciStatus === "failure").length;
      const mainFailing = data.defaultBranch?.ciStatus === "failure";
      return {
        repo,
        data,
        openCount: data.open.length,
        staleCount,
        failingPrCount,
        weekly: prsPerWeek(data.activity, now),
        mergeRate: mergeRate(data.activity, now),
        attentionScore:
          (mainFailing ? 100 : 0) + failingPrCount * 10 + staleCount * 5 + data.open.length,
      };
    })
    .sort((a, b) => b.attentionScore - a.attentionScore || a.repo.name.localeCompare(b.repo.name));

  const all = repos.flatMap(({ repo, data }) => data.open.map((pr) => ({ repo, pr })));
  const item = (repo: Repo, pr: PullRequest, detail: string): AttentionItem => ({
    repoId: repo.id,
    label: `${repo.name} #${pr.number}`,
    detail,
  });

  const stale = all
    .filter(({ pr }) => isStale(pr, now))
    .sort((a, b) => a.pr.updatedAt.localeCompare(b.pr.updatedAt));

  const failingBranches = repos.filter((r) => r.data.defaultBranch?.ciStatus === "failure");
  const failingPrs = all.filter(({ pr }) => pr.ciStatus === "failure");

  const waiting = all
    .filter(({ pr }) => pr.reviewState === "awaiting_review")
    .sort((a, b) => a.pr.createdAt.localeCompare(b.pr.createdAt));
  const avgWaitDays =
    waiting.length === 0
      ? null
      : waiting.reduce((sum, { pr }) => sum + daysSince(pr.createdAt, now), 0) / waiting.length;

  return {
    repos,
    stale: {
      count: stale.length,
      items: stale
        .slice(0, 2)
        .map(({ repo, pr }) => item(repo, pr, `${daysSince(pr.updatedAt, now)}d`)),
    },
    failingCi: {
      count: failingBranches.length + failingPrs.length,
      items: [
        ...failingBranches.map((r) => ({
          repoId: r.repo.id,
          label: `${r.repo.name} (${r.data.defaultBranch?.name})`,
          detail: "main",
        })),
        ...failingPrs.map(({ repo, pr }) => item(repo, pr, "PR")),
      ].slice(0, 2),
    },
    waitingForReview: {
      count: waiting.length,
      avgWaitDays,
      items: waiting
        .slice(0, 2)
        .map(({ repo, pr }) => item(repo, pr, `@${pr.author?.login ?? "ghost"}`)),
    },
  };
}
