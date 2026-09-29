import { describe, expect, it } from "vitest";

import { CACHE_TTL_MS, isFresh, syncedLabel } from "@/lib/cache-policy";

const now = new Date("2026-09-29T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);

describe("cache policy", () => {
  it("is fresh within the TTL", () => {
    expect(isFresh(ago(CACHE_TTL_MS - 1), now)).toBe(true);
    expect(isFresh(ago(CACHE_TTL_MS), now)).toBe(false);
    expect(isFresh(ago(1000), now, 500)).toBe(false);
  });

  it.each([
    [null, "Not synced yet"],
    [ago(30_000), "Synced just now"],
    [ago(4 * 60_000), "Synced 4m ago"],
    [ago(2 * 3_600_000), "Synced 2h ago"],
    [ago(3 * 86_400_000), "Synced 3d ago"],
  ])("labels %s", (fetchedAt, label) => {
    expect(syncedLabel(fetchedAt, now)).toBe(label);
  });
});
