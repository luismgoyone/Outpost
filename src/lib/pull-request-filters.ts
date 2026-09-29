/**
 * Filtering for the cross-repo Pull Requests screen. Pure, so it's unit-tested and the page
 * can stay a server component driven by URL search params.
 */
import { isStale, type PullRequest } from "@/lib/github/pull-requests";

export type PullRequestRow = { repoId: string; repoName: string; pr: PullRequest };

export const VIEWS = ["all", "mine", "needs-review", "stale", "failing"] as const;
export type View = (typeof VIEWS)[number];
export type Sort = "oldest" | "newest";

export type Filters = { view: View; repo: string | null; sort: Sort };

export type FilterContext = { ownerLogin: string | undefined; now: Date };

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseFilters(params: SearchParams): Filters {
  const view = first(params.view);
  const sort = first(params.sort);
  return {
    view: VIEWS.includes(view as View) ? (view as View) : "all",
    repo: first(params.repo) || null,
    sort: sort === "newest" ? "newest" : "oldest",
  };
}

function isMine(row: PullRequestRow, ctx: FilterContext): boolean {
  return !!ctx.ownerLogin && row.pr.author?.login.toLowerCase() === ctx.ownerLogin.toLowerCase();
}

export function matchesView(row: PullRequestRow, view: View, ctx: FilterContext): boolean {
  switch (view) {
    case "mine":
      return isMine(row, ctx);
    case "needs-review":
      return row.pr.reviewState === "awaiting_review";
    case "stale":
      return isStale(row.pr, ctx.now);
    case "failing":
      return row.pr.ciStatus === "failure";
    default:
      return true;
  }
}

export function applyFilters(
  rows: PullRequestRow[],
  filters: Filters,
  ctx: FilterContext,
): PullRequestRow[] {
  const direction = filters.sort === "oldest" ? 1 : -1;
  return rows
    .filter((row) => !filters.repo || row.repoName === filters.repo)
    .filter((row) => matchesView(row, filters.view, ctx))
    .sort((a, b) => direction * a.pr.createdAt.localeCompare(b.pr.createdAt));
}

/** Counts per view, within the selected repo, for the filter chips. */
export function countByView(
  rows: PullRequestRow[],
  repo: string | null,
  ctx: FilterContext,
): Record<View, number> {
  const inRepo = rows.filter((row) => !repo || row.repoName === repo);
  return Object.fromEntries(
    VIEWS.map((view) => [view, inRepo.filter((row) => matchesView(row, view, ctx)).length]),
  ) as Record<View, number>;
}

/** Build a URL for the filter bar, dropping defaults to keep links short. */
export function filterHref(filters: Filters, change: Partial<Filters>): string {
  const next = { ...filters, ...change };
  const params = new URLSearchParams();
  if (next.view !== "all") params.set("view", next.view);
  if (next.repo) params.set("repo", next.repo);
  if (next.sort !== "oldest") params.set("sort", next.sort);
  const query = params.toString();
  return query ? `/pull-requests?${query}` : "/pull-requests";
}
