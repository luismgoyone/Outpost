import "server-only";

import { and, eq, inArray, min } from "drizzle-orm";

import { getDb } from "@/db";
import { statsCache, type Repo } from "@/db/schema";

import { isFresh, type CacheKey } from "./cache-policy";

/**
 * Read-through cache for GitHub data, stored in Postgres so it's shared by every server
 * instance. Fresh rows are served as-is; stale or missing rows are refetched. If GitHub
 * fails and an older copy exists, the older copy is served instead of an error.
 */
export async function cached<T>(repo: Repo, key: CacheKey, load: () => Promise<T>): Promise<T> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(statsCache)
    .where(and(eq(statsCache.repoId, repo.id), eq(statsCache.key, key)))
    .limit(1);

  if (row && isFresh(row.fetchedAt, new Date())) return row.data as T;

  try {
    const data = await load();
    await db
      .insert(statsCache)
      .values({ repoId: repo.id, key, data: data as object, fetchedAt: new Date() })
      .onConflictDoUpdate({
        target: [statsCache.repoId, statsCache.key],
        set: { data: data as object, fetchedAt: new Date() },
      });
    return data;
  } catch (error) {
    if (row) return row.data as T;
    throw error;
  }
}

/** Every cached payload of one kind, fresh or not. For cheap summaries like sidebar badges. */
export async function readAllCached<T>(key: CacheKey): Promise<Array<{ repoId: string; data: T }>> {
  const rows = await getDb()
    .select({ repoId: statsCache.repoId, data: statsCache.data })
    .from(statsCache)
    .where(eq(statsCache.key, key));
  return rows.map((r) => ({ repoId: r.repoId, data: r.data as T }));
}

/** The oldest "pulls" snapshot: how stale the dashboard could be at worst. */
export async function oldestSync(): Promise<Date | null> {
  const [row] = await getDb()
    .select({ oldest: min(statsCache.fetchedAt) })
    .from(statsCache)
    .where(eq(statsCache.key, "pulls"));
  return row?.oldest ?? null;
}

/** Drop cached data so the next read refetches. All repos when `repoIds` is omitted. */
export async function invalidate(repoIds?: string[]): Promise<void> {
  const db = getDb();
  if (repoIds === undefined) await db.delete(statsCache);
  else if (repoIds.length > 0)
    await db.delete(statsCache).where(inArray(statsCache.repoId, repoIds));
}
