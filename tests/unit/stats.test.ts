import { describe, expect, it } from "vitest";

import { mergeRate, prsPerWeek } from "@/lib/stats";

const now = new Date("2026-09-29T12:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();
const pr = (created: number, merged?: number, closed?: number) => ({
  createdAt: daysAgo(created),
  mergedAt: merged === undefined ? null : daysAgo(merged),
  closedAt: closed === undefined ? null : daysAgo(closed),
});

describe("prsPerWeek", () => {
  it("buckets PRs into rolling weeks, oldest first", () => {
    const weeks = prsPerWeek([pr(1), pr(6.9), pr(7.1), pr(20), pr(60)], now, 4);
    expect(weeks.map((w) => w.count)).toEqual([0, 1, 1, 2]);
    expect(weeks).toHaveLength(4);
    expect(new Date(weeks[3].weekStart).toISOString()).toBe(daysAgo(7));
  });

  it("returns zeros for an idle repo", () => {
    expect(prsPerWeek([], now, 3).map((w) => w.count)).toEqual([0, 0, 0]);
  });
});

describe("mergeRate", () => {
  it("is merged / closed within the window", () => {
    const activity = [pr(10, 5, 5), pr(10, 3, 3), pr(10, undefined, 2), pr(40, 35, 35), pr(1)];
    expect(mergeRate(activity, now)).toBeCloseTo(2 / 3);
  });

  it("is null when nothing closed recently", () => {
    expect(mergeRate([pr(1), pr(50, 45, 45)], now)).toBeNull();
  });
});
