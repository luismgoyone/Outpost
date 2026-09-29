/** GitHub Actions runs grouped per workflow for the repo detail "Workflows" tab. Pure. */

export type RunState = "success" | "failure" | "running" | "cancelled" | "skipped";

export type WorkflowRun = {
  id: number;
  workflowId: number;
  name: string;
  path: string;
  event: string;
  branch: string | null;
  state: RunState;
  startedAt: string;
  updatedAt: string;
  durationSeconds: number | null;
  url: string;
};

export type WorkflowSummary = {
  workflowId: number;
  name: string;
  path: string;
  /** Up to 10 most recent runs, oldest first (reads left to right like the design). */
  lastRuns: WorkflowRun[];
  /** Share of finished (success/failure) runs that succeeded; null if none finished. */
  passRate: number | null;
  /** Median duration of successful runs, in seconds. */
  typicalDuration: number | null;
  latest: WorkflowRun;
  events: string[];
};

/** The REST API run shape, reduced to what we use. */
export type ApiRun = {
  id: number;
  workflow_id: number;
  name?: string | null;
  path: string;
  event: string;
  head_branch: string | null;
  status: string | null;
  conclusion: string | null;
  run_started_at?: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
};

export function toRunState(status: string | null, conclusion: string | null): RunState {
  if (status !== "completed") return "running";
  switch (conclusion) {
    case "success":
      return "success";
    case "cancelled":
      return "cancelled";
    case "skipped":
    case "neutral":
      return "skipped";
    default:
      return "failure"; // failure, timed_out, action_required, startup_failure, stale
  }
}

export function mapRun(run: ApiRun): WorkflowRun {
  const state = toRunState(run.status, run.conclusion);
  const startedAt = run.run_started_at ?? run.created_at;
  const finished = state !== "running";
  return {
    id: run.id,
    workflowId: run.workflow_id,
    name: run.name ?? run.path,
    path: run.path,
    event: run.event,
    branch: run.head_branch,
    state,
    startedAt,
    updatedAt: run.updated_at,
    durationSeconds: finished
      ? Math.max(0, Math.round((Date.parse(run.updated_at) - Date.parse(startedAt)) / 1000))
      : null,
    url: run.html_url,
  };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function summarizeWorkflows(runs: WorkflowRun[]): WorkflowSummary[] {
  const byWorkflow = new Map<number, WorkflowRun[]>();
  for (const run of runs) {
    byWorkflow.set(run.workflowId, [...(byWorkflow.get(run.workflowId) ?? []), run]);
  }
  return [...byWorkflow.values()]
    .map((list) => {
      const newestFirst = [...list].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
      const recent = newestFirst.slice(0, 10);
      const finished = recent.filter((r) => r.state === "success" || r.state === "failure");
      const latest = newestFirst[0];
      return {
        workflowId: latest.workflowId,
        name: latest.name,
        path: latest.path,
        lastRuns: [...recent].reverse(),
        passRate:
          finished.length === 0
            ? null
            : finished.filter((r) => r.state === "success").length / finished.length,
        typicalDuration: median(
          recent.filter((r) => r.state === "success").map((r) => r.durationSeconds ?? 0),
        ),
        latest,
        events: [...new Set(recent.map((r) => r.event))],
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
