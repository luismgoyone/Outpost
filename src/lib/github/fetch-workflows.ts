import "server-only";

import type { Repo } from "@/db/schema";

import { getInstallationOctokit } from "./app";
import { isPermissionError } from "./deployments";
import { mapRun, summarizeWorkflows, type ApiRun, type WorkflowSummary } from "./workflows";

export type WorkflowsResult =
  | { ok: true; workflows: WorkflowSummary[] }
  | { ok: false; permissionMissing: boolean; message: string };

export async function fetchWorkflows(repo: Repo): Promise<WorkflowsResult> {
  try {
    const octokit = await getInstallationOctokit(repo.installationId);
    const { data } = await octokit.rest.actions.listWorkflowRunsForRepo({
      owner: repo.owner,
      repo: repo.name,
      per_page: 100,
    });
    return {
      ok: true,
      workflows: summarizeWorkflows((data.workflow_runs as ApiRun[]).map(mapRun)),
    };
  } catch (error) {
    const err = error as { status?: number; message?: string };
    const message = String(err.message ?? error);
    return {
      ok: false,
      permissionMissing: err.status === 403 || isPermissionError(message),
      message,
    };
  }
}
