import { describe, expect, it } from "vitest";

import type { DefaultBranch, PullRequest } from "@/lib/github/pull-requests";
import { buildMyWork, needsMyAction, type RepoSnapshot } from "@/lib/my-work";

const now = new Date("2026-09-29T12:00:00Z");

function pr(number: number, overrides: Partial<PullRequest> = {}): PullRequest {
  return {
    number,
    title: `PR ${number}`,
    url: `https://github.com/acme/x/pull/${number}`,
    author: { login: "someone", avatarUrl: "" },
    isDraft: false,
    createdAt: "2026-09-27T00:00:00Z",
    updatedAt: "2026-09-28T00:00:00Z",
    mergedAt: null,
    ciStatus: "success",
    reviewState: "awaiting_review",
    approvals: 0,
    requestedReviewers: [],
    headRefName: "b",
    additions: 1,
    deletions: 1,
    ...overrides,
  };
}

const branch = (ciStatus: DefaultBranch["ciStatus"]): DefaultBranch => ({
  name: "main",
  ciStatus,
  sha: "abc",
  message: "m",
  url: "u",
  committedAt: "2026-09-28T00:00:00Z",
});

const snapshots: RepoSnapshot[] = [
  {
    repoId: "1",
    repoName: "web",
    defaultBranch: branch("success"),
    open: [
      pr(1, { requestedReviewers: ["Owner"], updatedAt: "2026-09-28T01:00:00Z" }),
      pr(2, { requestedReviewers: ["owner"], updatedAt: "2026-09-28T05:00:00Z" }),
      pr(3, { requestedReviewers: ["owner"], isDraft: true }), // drafts aren't ready for review
      pr(4, { author: { login: "owner", avatarUrl: "" }, reviewState: "changes_requested" }),
      pr(5, { author: { login: "owner", avatarUrl: "" }, updatedAt: "2026-09-10T00:00:00Z" }),
    ],
  },
  {
    repoId: "2",
    repoName: "api",
    defaultBranch: branch("failure"),
    open: [
      pr(6, { updatedAt: "2026-09-01T00:00:00Z" }),
      pr(7, { updatedAt: "2026-09-15T00:00:00Z" }),
      pr(8, { requestedReviewers: ["someone-else"] }),
    ],
  },
  { repoId: "3", repoName: "empty", defaultBranch: null, open: [] },
];

describe("buildMyWork", () => {
  const work = buildMyWork(snapshots, "owner", now);
  const numbers = (items: { pr: PullRequest }[]) => items.map((i) => i.pr.number);

  it("collects review requests for the owner, newest first, excluding drafts", () => {
    expect(numbers(work.reviewRequests)).toEqual([2, 1]);
  });

  it("collects the owner's own PRs, including stale ones", () => {
    expect(numbers(work.myPullRequests)).toEqual([4, 5]);
  });

  it("lists other people's stale PRs, oldest first", () => {
    expect(numbers(work.stale)).toEqual([6, 7]);
  });

  it("flags repos whose default branch is failing", () => {
    expect(work.failingBranches.map((f) => f.repoName)).toEqual(["api"]);
  });

  it("counts what needs action", () => {
    // 2 review requests + 1 of my PRs with changes requested + 2 stale + 1 failing branch
    expect(work.attentionCount).toBe(6);
  });

  it("is empty without an owner login", () => {
    const anon = buildMyWork(snapshots, undefined, now);
    expect(anon.reviewRequests).toEqual([]);
    expect(anon.myPullRequests).toEqual([]);
  });
});

describe("needsMyAction", () => {
  it("is true for changes requested or failing CI", () => {
    expect(needsMyAction(pr(1, { reviewState: "changes_requested" }))).toBe(true);
    expect(needsMyAction(pr(1, { ciStatus: "failure" }))).toBe(true);
    expect(needsMyAction(pr(1, { reviewState: "approved" }))).toBe(false);
  });
});
