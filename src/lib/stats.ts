/** Repo statistics for the Overview screen. Pure and unit-tested. */
import type { PullRequestActivity } from "@/lib/github/pull-requests";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

export type WeekBucket = { weekStart: string; count: number };

/**
 * PRs opened per week, oldest week first, for the last `weeks` weeks ending now.
 * Weeks are rolling 7-day windows so the latest bucket is always "the last 7 days".
 */
export function prsPerWeek(activity: PullRequestActivity[], now: Date, weeks = 8): WeekBucket[] {
  const end = now.getTime();
  return Array.from({ length: weeks }, (_, i) => {
    const bucketEnd = end - (weeks - 1 - i) * WEEK_MS;
    const bucketStart = bucketEnd - WEEK_MS;
    const count = activity.filter((pr) => {
      const t = new Date(pr.createdAt).getTime();
      return t > bucketStart && t <= bucketEnd;
    }).length;
    return { weekStart: new Date(bucketStart).toISOString(), count };
  });
}

/**
 * Share of PRs closed in the last `days` days that were merged (vs closed unmerged).
 * Null when nothing closed in the window, so the UI can show "—" rather than 0%.
 */
export function mergeRate(activity: PullRequestActivity[], now: Date, days = 30): number | null {
  const since = now.getTime() - days * DAY_MS;
  const closed = activity.filter((pr) => pr.closedAt && new Date(pr.closedAt).getTime() > since);
  if (closed.length === 0) return null;
  return closed.filter((pr) => pr.mergedAt).length / closed.length;
}
