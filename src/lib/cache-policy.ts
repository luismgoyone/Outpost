/** Cache freshness rules. Pure, so they're unit-tested apart from the database. */

export const CACHE_TTL_MS = 5 * 60 * 1000;

export type CacheKey = "pulls" | "deployments" | "releases" | "workflows" | "shipping";

export function isFresh(fetchedAt: Date, now: Date, ttlMs = CACHE_TTL_MS): boolean {
  return now.getTime() - fetchedAt.getTime() < ttlMs;
}

/** "just now", "4m ago", "2h ago", "3d ago" for the header sync indicator. */
export function syncedLabel(fetchedAt: Date | null, now: Date): string {
  if (!fetchedAt) return "Not synced yet";
  const minutes = Math.floor((now.getTime() - fetchedAt.getTime()) / 60_000);
  if (minutes < 1) return "Synced just now";
  if (minutes < 60) return `Synced ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Synced ${hours}h ago`;
  return `Synced ${Math.floor(hours / 24)}d ago`;
}
