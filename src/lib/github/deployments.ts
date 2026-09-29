/**
 * GitHub Deployments (what Vercel, Netlify and CI report for production and preview
 * deploys). Pure query + mapping; I/O lives in fetch-deployments.ts.
 */

export type DeployState = "success" | "failure" | "building" | "inactive" | "unknown";
export type EnvironmentKind = "production" | "staging" | "preview" | "other";

export type Deployment = {
  id: string;
  environment: string;
  environmentKind: EnvironmentKind;
  state: DeployState;
  sha: string;
  message: string;
  ref: string | null;
  creator: string | null;
  createdAt: string;
  /** Time from deployment creation to its latest status, when it has finished. */
  durationSeconds: number | null;
  url: string | null;
  logUrl: string | null;
};

export const DEPLOYMENTS_QUERY = /* GraphQL */ `
  query RepoDeployments($owner: String!, $name: String!, $count: Int!) {
    repository(owner: $owner, name: $name) {
      deployments(first: $count, orderBy: { field: CREATED_AT, direction: DESC }) {
        nodes {
          id
          environment
          createdAt
          ref {
            name
          }
          commitOid
          commit {
            messageHeadline
          }
          creator {
            login
          }
          latestStatus {
            state
            createdAt
            environmentUrl
            logUrl
          }
        }
      }
    }
  }
`;

type DeploymentNode = {
  id: string;
  environment: string | null;
  createdAt: string;
  ref: { name: string } | null;
  commitOid: string;
  commit: { messageHeadline: string } | null;
  creator: { login: string } | null;
  latestStatus: {
    state: string;
    createdAt: string;
    environmentUrl: string | null;
    logUrl: string | null;
  } | null;
};

export type DeploymentsQueryResult = {
  repository: { deployments: { nodes: Array<DeploymentNode | null> | null } } | null;
};

export function toEnvironmentKind(environment: string): EnvironmentKind {
  const env = environment.toLowerCase();
  if (/\bprod(uction)?\b/.test(env)) return "production";
  if (/\b(staging|stage|stg)\b/.test(env)) return "staging";
  if (/preview|\bpr-\d+|review/.test(env)) return "preview";
  return "other";
}

/** GitHub's DeploymentStatusState → what the UI shows. */
export function toDeployState(state: string | null | undefined): DeployState {
  switch (state) {
    case "SUCCESS":
      return "success";
    case "FAILURE":
    case "ERROR":
      return "failure";
    case "PENDING":
    case "QUEUED":
    case "IN_PROGRESS":
    case "WAITING":
      return "building";
    case "INACTIVE":
    case "DESTROYED":
      return "inactive";
    default:
      return "unknown";
  }
}

export function mapDeployments(result: DeploymentsQueryResult): Deployment[] {
  const nodes = result.repository?.deployments.nodes ?? [];
  return nodes
    .filter((n): n is DeploymentNode => n !== null)
    .map((node) => {
      const environment = node.environment ?? "unknown";
      const state = toDeployState(node.latestStatus?.state);
      const finished = state === "success" || state === "failure";
      return {
        id: node.id,
        environment,
        environmentKind: toEnvironmentKind(environment),
        state,
        sha: node.commitOid,
        message: node.commit?.messageHeadline ?? "",
        ref: node.ref?.name ?? null,
        creator: node.creator?.login ?? null,
        createdAt: node.createdAt,
        durationSeconds:
          finished && node.latestStatus
            ? Math.max(
                0,
                Math.round(
                  (new Date(node.latestStatus.createdAt).getTime() -
                    new Date(node.createdAt).getTime()) /
                    1000,
                ),
              )
            : null,
        url: node.latestStatus?.environmentUrl || null,
        logUrl: node.latestStatus?.logUrl || null,
      };
    });
}

/** The newest deployment per environment: "what's live (or broken) right now". */
export function latestPerEnvironment(deployments: Deployment[]): Deployment[] {
  const seen = new Map<string, Deployment>();
  for (const d of [...deployments].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    // Superseded preview deploys go inactive; they don't represent the current state.
    if (d.state === "inactive") continue;
    if (!seen.has(d.environment)) seen.set(d.environment, d);
  }
  return [...seen.values()];
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
}

/** GitHub returns this when the App lacks the Deployments permission. */
export function isPermissionError(message: string): boolean {
  return /resource not accessible by integration|FORBIDDEN/i.test(message);
}
