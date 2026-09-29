import { describe, expect, it } from "vitest";

import { formatAge, isStale, toReviewState, type PullRequest } from "@/lib/github/pull-requests";
import {
  applyFilters,
  countByView,
  filterHref,
  parseFilters,
  type PullRequestRow,
} from "@/lib/pull-request-filters";

const now = new Date("2026-09-29T12:00:00Z");

function row(repoName: string, overrides: Partial<PullRequest>): PullRequestRow {
  return {
    repoId: repoName,
    repoName,
    pr: {
      number: 1,
      title: "PR",
      url: "https://github.com/x/y/pull/1",
      author: { login: "someone", avatarUrl: "" },
      isDraft: false,
      createdAt: "2026-09-28T12:00:00Z",
      updatedAt: "2026-09-28T12:00:00Z",
      mergedAt: null,
      ciStatus: "success",
      reviewState: "awaiting_review",
      approvals: 0,
      requestedReviewers: [],
      headRefName: "feat/x",
      additions: 1,
      deletions: 1,
      ...overrides,
    },
  };
}

const rows = [
  row("web", { number: 1, author: { login: "Owner", avatarUrl: "" }, reviewState: "approved" }),
  row("web", { number: 2, ciStatus: "failure", createdAt: "2026-09-01T00:00:00Z" }),
  row("api", { number: 3, updatedAt: "2026-09-10T00:00:00Z", createdAt: "2026-09-05T00:00:00Z" }),
  row("api", { number: 4, isDraft: true, reviewState: "draft" }),
];
const ctx = { ownerLogin: "owner", now };

describe("review state and time helpers", () => {
  it("maps drafts and review decisions", () => {
    expect(toReviewState(true, "APPROVED")).toBe("draft");
    expect(toReviewState(false, "APPROVED")).toBe("approved");
    expect(toReviewState(false, "CHANGES_REQUESTED")).toBe("changes_requested");
    expect(toReviewState(false, "REVIEW_REQUIRED")).toBe("awaiting_review");
    expect(toReviewState(false, null)).toBe("awaiting_review");
  });

  it("marks PRs stale after 7 days without updates, never merged ones", () => {
    expect(isStale({ updatedAt: "2026-09-22T11:59:00Z", mergedAt: null }, now)).toBe(true);
    expect(isStale({ updatedAt: "2026-09-22T12:01:00Z", mergedAt: null }, now)).toBe(false);
    expect(
      isStale({ updatedAt: "2026-09-01T00:00:00Z", mergedAt: "2026-09-02T00:00:00Z" }, now),
    ).toBe(false);
  });

  it.each([
    ["2026-09-29T11:15:00Z", "45m"],
    ["2026-09-29T08:00:00Z", "4h"],
    ["2026-09-26T12:00:00Z", "3d"],
    ["2026-09-01T12:00:00Z", "4w"],
    ["2026-09-29T13:00:00Z", "0m"],
  ])("formatAge(%s) = %s", (iso, expected) => {
    expect(formatAge(iso, now)).toBe(expected);
  });
});

describe("pull request filters", () => {
  it("parses search params with safe defaults", () => {
    expect(parseFilters({})).toEqual({ view: "all", repo: null, sort: "oldest" });
    expect(parseFilters({ view: "stale", repo: "api", sort: "newest" })).toEqual({
      view: "stale",
      repo: "api",
      sort: "newest",
    });
    expect(parseFilters({ view: "bogus", sort: ["newest"] })).toEqual({
      view: "all",
      repo: null,
      sort: "newest",
    });
  });

  it("filters by view and repo, oldest first by default", () => {
    const numbers = (view: string, repo: string | null = null, sort = "oldest") =>
      applyFilters(rows, parseFilters({ view, repo: repo ?? undefined, sort }), ctx).map(
        (r) => r.pr.number,
      );
    expect(numbers("all")).toEqual([2, 3, 1, 4]);
    expect(numbers("all", null, "newest")).toEqual([1, 4, 3, 2]);
    expect(numbers("mine")).toEqual([1]); // case-insensitive owner match
    expect(numbers("needs-review")).toEqual([2, 3]); // drafts and approved excluded
    expect(numbers("stale")).toEqual([3]); // by last update, not creation
    expect(numbers("failing")).toEqual([2]);
    expect(numbers("all", "api")).toEqual([3, 4]);
  });

  it("counts every view within the selected repo", () => {
    expect(countByView(rows, null, ctx)).toEqual({
      all: 4,
      mine: 1,
      "needs-review": 2,
      stale: 1,
      failing: 1,
    });
    expect(countByView(rows, "web", ctx).all).toBe(2);
  });

  it("builds short filter links", () => {
    const base = parseFilters({});
    expect(filterHref(base, {})).toBe("/pull-requests");
    expect(filterHref(base, { view: "stale", repo: "api" })).toBe(
      "/pull-requests?view=stale&repo=api",
    );
    expect(filterHref({ ...base, view: "mine" }, { view: "all" })).toBe("/pull-requests");
  });
});
