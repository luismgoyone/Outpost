import { describe, expect, it } from "vitest";

import { mapRun, summarizeWorkflows, toRunState, type ApiRun } from "@/lib/github/workflows";

const run = (
  id: number,
  workflowId: number,
  conclusion: string | null,
  minute: number,
  dur = 120,
  extra: Partial<ApiRun> = {},
): ApiRun => {
  const start = new Date(Date.UTC(2026, 8, 29, 10, minute));
  return {
    id,
    workflow_id: workflowId,
    name: workflowId === 1 ? "CI" : "Deploy",
    path: workflowId === 1 ? ".github/workflows/ci.yml" : ".github/workflows/deploy.yml",
    event: "push",
    head_branch: "main",
    status: conclusion === null ? "in_progress" : "completed",
    conclusion,
    run_started_at: start.toISOString(),
    created_at: start.toISOString(),
    updated_at: new Date(start.getTime() + dur * 1000).toISOString(),
    html_url: `https://github.com/acme/x/actions/runs/${id}`,
    ...extra,
  };
};

describe("toRunState", () => {
  it.each([
    ["completed", "success", "success"],
    ["completed", "failure", "failure"],
    ["completed", "timed_out", "failure"],
    ["completed", "cancelled", "cancelled"],
    ["completed", "skipped", "skipped"],
    ["in_progress", null, "running"],
    ["queued", null, "running"],
  ] as const)("%s/%s → %s", (status, conclusion, expected) => {
    expect(toRunState(status, conclusion)).toBe(expected);
  });
});

describe("summarizeWorkflows", () => {
  const runs = [
    run(1, 1, "success", 1, 100),
    run(2, 1, "failure", 2, 50),
    run(3, 1, "success", 3, 140),
    run(4, 1, "cancelled", 4),
    run(5, 1, null, 5),
    run(6, 2, "success", 6, 300, { event: "workflow_dispatch" }),
    ...Array.from({ length: 12 }, (_, i) => run(100 + i, 2, "success", 10 + i, 200)),
  ].map(mapRun);
  const [ci, deploy] = summarizeWorkflows(runs);

  it("groups by workflow, sorted by name", () => {
    expect(ci.name).toBe("CI");
    expect(deploy.name).toBe("Deploy");
  });

  it("keeps the last 10 runs, oldest first", () => {
    expect(ci.lastRuns.map((r) => r.id)).toEqual([1, 2, 3, 4, 5]);
    expect(deploy.lastRuns).toHaveLength(10);
    expect(deploy.lastRuns.at(-1)?.id).toBe(111);
    expect(ci.latest.state).toBe("running");
  });

  it("computes pass rate over finished runs and median successful duration", () => {
    expect(ci.passRate).toBeCloseTo(2 / 3);
    expect(ci.typicalDuration).toBe(120); // median of 100 and 140
    expect(ci.lastRuns[4].durationSeconds).toBeNull(); // still running
  });

  it("lists distinct trigger events in the window", () => {
    expect(ci.events).toEqual(["push"]);
    // The workflow_dispatch run fell out of the 10-run window.
    expect(deploy.events).toEqual(["push"]);
  });
});
