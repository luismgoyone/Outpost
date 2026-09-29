import { describe, expect, it } from "vitest";

import {
  formatDuration,
  isPermissionError,
  latestPerEnvironment,
  mapDeployments,
  toDeployState,
  toEnvironmentKind,
  type Deployment,
} from "@/lib/github/deployments";

describe("deployment mapping", () => {
  it.each([
    ["Production", "production"],
    ["prod", "production"],
    ["Preview", "preview"],
    ["pr-412", "preview"],
    ["staging", "staging"],
    ["stg-eu", "staging"],
    ["github-pages", "other"],
  ] as const)("environment %s is %s", (env, kind) => {
    expect(toEnvironmentKind(env)).toBe(kind);
  });

  it.each([
    ["SUCCESS", "success"],
    ["ERROR", "failure"],
    ["FAILURE", "failure"],
    ["IN_PROGRESS", "building"],
    ["QUEUED", "building"],
    ["INACTIVE", "inactive"],
    [null, "unknown"],
  ] as const)("status %s is %s", (state, expected) => {
    expect(toDeployState(state)).toBe(expected);
  });

  it("maps nodes, with duration only for finished deploys", () => {
    const [done, building] = mapDeployments({
      repository: {
        deployments: {
          nodes: [
            {
              id: "D1",
              environment: "Production",
              createdAt: "2026-09-29T10:00:00Z",
              ref: { name: "main" },
              commitOid: "29fd031abc",
              commit: { messageHeadline: "feat(pricing): update tiers" },
              creator: { login: "vercel" },
              latestStatus: {
                state: "SUCCESS",
                createdAt: "2026-09-29T10:01:24Z",
                environmentUrl: "https://acme.vercel.app",
                logUrl: "https://vercel.com/logs/1",
              },
            },
            null,
            {
              id: "D2",
              environment: "Preview",
              createdAt: "2026-09-29T11:00:00Z",
              ref: null,
              commitOid: "7e148a0",
              commit: null,
              creator: null,
              latestStatus: {
                state: "IN_PROGRESS",
                createdAt: "2026-09-29T11:00:30Z",
                environmentUrl: "",
                logUrl: null,
              },
            },
          ],
        },
      },
    });
    expect(done).toMatchObject({
      environmentKind: "production",
      state: "success",
      durationSeconds: 84,
      url: "https://acme.vercel.app",
      ref: "main",
    });
    expect(building).toMatchObject({
      state: "building",
      durationSeconds: null,
      url: null,
      message: "",
    });
    expect(mapDeployments({ repository: null })).toEqual([]);
  });
});

describe("helpers", () => {
  const d = (id: string, environment: string, createdAt: string, state: Deployment["state"]) =>
    ({ id, environment, createdAt, state }) as Deployment;

  it("keeps the newest non-inactive deployment per environment", () => {
    const latest = latestPerEnvironment([
      d("1", "Production", "2026-09-01", "failure"),
      d("2", "Production", "2026-09-02", "success"),
      d("3", "Preview", "2026-09-03", "inactive"),
      d("4", "Preview", "2026-09-01", "failure"),
    ]);
    expect(latest.map((x) => x.id).sort()).toEqual(["2", "4"]);
  });

  it("formats durations", () => {
    expect(formatDuration(84)).toBe("1m 24s");
    expect(formatDuration(9)).toBe("9s");
    expect(formatDuration(null)).toBe("—");
  });

  it("recognizes permission errors", () => {
    expect(isPermissionError("Resource not accessible by integration")).toBe(true);
    expect(isPermissionError("Something else")).toBe(false);
  });
});

import {
  applyDeploymentFilters,
  countByStatus,
  deploymentsHref,
  parseDeploymentFilters,
  type DeploymentRow,
} from "@/lib/deployment-filters";

describe("deployment filters", () => {
  const row = (repoName: string, environmentKind: string, state: string, createdAt: string) =>
    ({
      repoId: repoName,
      repoName,
      deployment: { environmentKind, state, createdAt },
    }) as DeploymentRow;
  const rows = [
    row("web", "production", "success", "2026-09-01"),
    row("web", "preview", "failure", "2026-09-03"),
    row("api", "production", "building", "2026-09-02"),
    row("api", "staging", "failure", "2026-09-04"),
  ];

  it("parses params with defaults", () => {
    expect(parseDeploymentFilters({})).toEqual({ env: "all", status: "all", repo: null });
    expect(parseDeploymentFilters({ env: "bogus", status: "failure", repo: "web" })).toEqual({
      env: "all",
      status: "failure",
      repo: "web",
    });
  });

  it("filters by environment, status and repo, newest first", () => {
    const ids = (params: Record<string, string>) =>
      applyDeploymentFilters(rows, parseDeploymentFilters(params)).map(
        (r) => `${r.repoName}:${r.deployment.environmentKind}`,
      );
    expect(ids({})).toEqual(["api:staging", "web:preview", "api:production", "web:production"]);
    expect(ids({ env: "production" })).toEqual(["api:production", "web:production"]);
    expect(ids({ status: "failure", repo: "web" })).toEqual(["web:preview"]);
  });

  it("counts statuses within the repo and environment scope", () => {
    expect(countByStatus(rows, parseDeploymentFilters({ env: "production" }))).toEqual({
      all: 2,
      success: 1,
      failure: 0,
      building: 1,
    });
  });

  it("builds short links", () => {
    const f = parseDeploymentFilters({});
    expect(deploymentsHref(f, {})).toBe("/deployments");
    expect(deploymentsHref(f, { env: "preview", status: "failure" })).toBe(
      "/deployments?env=preview&status=failure",
    );
  });
});
