/** Filters for the Deployments screen, driven by URL search params. Pure. */
import type { Deployment, DeployState, EnvironmentKind } from "@/lib/github/deployments";

export type DeploymentRow = { repoId: string; repoName: string; deployment: Deployment };

export const ENVIRONMENTS = ["all", "production", "staging", "preview"] as const;
export const STATUSES = ["all", "success", "failure", "building"] as const;
export type EnvFilter = (typeof ENVIRONMENTS)[number];
export type StatusFilter = (typeof STATUSES)[number];
export type DeploymentFilters = { env: EnvFilter; status: StatusFilter; repo: string | null };

type Params = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseDeploymentFilters(params: Params): DeploymentFilters {
  const env = first(params.env) as EnvFilter;
  const status = first(params.status) as StatusFilter;
  return {
    env: ENVIRONMENTS.includes(env) ? env : "all",
    status: STATUSES.includes(status) ? status : "all",
    repo: first(params.repo) || null,
  };
}

const matchesEnv = (kind: EnvironmentKind, env: EnvFilter) => env === "all" || kind === env;
const matchesStatus = (state: DeployState, status: StatusFilter) =>
  status === "all" || state === status;

export function applyDeploymentFilters(rows: DeploymentRow[], f: DeploymentFilters) {
  return rows
    .filter((r) => !f.repo || r.repoName === f.repo)
    .filter((r) => matchesEnv(r.deployment.environmentKind, f.env))
    .filter((r) => matchesStatus(r.deployment.state, f.status))
    .sort((a, b) => b.deployment.createdAt.localeCompare(a.deployment.createdAt));
}

/** Status counts within the current repo + environment selection. */
export function countByStatus(rows: DeploymentRow[], f: DeploymentFilters) {
  const scoped = rows.filter(
    (r) => (!f.repo || r.repoName === f.repo) && matchesEnv(r.deployment.environmentKind, f.env),
  );
  return Object.fromEntries(
    STATUSES.map((s) => [s, scoped.filter((r) => matchesStatus(r.deployment.state, s)).length]),
  ) as Record<StatusFilter, number>;
}

export function deploymentsHref(f: DeploymentFilters, change: Partial<DeploymentFilters>) {
  const next = { ...f, ...change };
  const params = new URLSearchParams();
  if (next.env !== "all") params.set("env", next.env);
  if (next.status !== "all") params.set("status", next.status);
  if (next.repo) params.set("repo", next.repo);
  const q = params.toString();
  return q ? `/deployments?${q}` : "/deployments";
}
