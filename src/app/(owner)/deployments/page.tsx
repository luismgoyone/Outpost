import { cn } from "cn";
import type { Metadata } from "next";
import Link from "next/link";

import { RepoSelect } from "@/components/repo-select";
import { DeploymentTable } from "@/components/deployment-table";
import { PageHeader } from "@/components/shell/page-header";
import { Panel, PanelEmpty } from "@/components/shell/panel";
import {
  applyDeploymentFilters,
  countByStatus,
  deploymentsHref,
  ENVIRONMENTS,
  parseDeploymentFilters,
  STATUSES,
  type DeploymentRow,
} from "@/lib/deployment-filters";
import { fetchAllDeployments } from "@/lib/github/fetch-deployments";
import { requireOwner } from "@/lib/owner";
import { listConnectedRepos } from "@/lib/repos";

export const metadata: Metadata = { title: "Deployments · Outpost" };

const ENV_LABEL: Record<(typeof ENVIRONMENTS)[number], string> = {
  all: "All environments",
  production: "Production",
  staging: "Staging",
  preview: "Preview",
};

const STATUS_FILTER_LABEL = {
  all: "All statuses",
  success: "Success",
  failure: "Failed",
  building: "Building",
};

export default async function DeploymentsPage(props: PageProps<"/deployments">) {
  await requireOwner("/deployments");
  const filters = parseDeploymentFilters(await props.searchParams);
  const now = new Date();

  const repos = await listConnectedRepos();
  const { results, errors, permissionMissing } = await fetchAllDeployments(repos);
  const rows: DeploymentRow[] = results.flatMap(({ repo, deployments }) =>
    deployments.map((deployment) => ({ repoId: repo.id, repoName: repo.name, deployment })),
  );
  const visible = applyDeploymentFilters(rows, filters).slice(0, 50);
  const counts = countByStatus(rows, filters);
  const repoNames = [...new Set(repos.map((r) => r.name))].sort();
  const repoHrefs = Object.fromEntries([
    ["__all", deploymentsHref(filters, { repo: null })],
    ...repoNames.map((name) => [name, deploymentsHref(filters, { repo: name })]),
  ]);

  return (
    <>
      <PageHeader
        title="Deployments"
        count={`${results.length} repositories`}
        description="Production, staging and preview deployments reported to GitHub (Vercel, Netlify, CI)"
      />

      {errors.length > 0 && (
        <div
          role="alert"
          className="border-warning/20 bg-warning/8 text-warning rounded-sm border px-3 py-2 font-mono text-[11px]"
        >
          {permissionMissing
            ? `Can't read deployments for ${errors.map((e) => e.repo.name).join(", ")}. In your GitHub App settings, set Repository permissions → Deployments to "Read-only", then accept the new permission on the installation.`
            : `Couldn't load deployments for ${errors.map((e) => e.repo.name).join(", ")}.`}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <RepoSelect repos={repoNames} value={filters.repo} hrefFor={repoHrefs} />
          <nav aria-label="Environment" className="bg-panel flex rounded-sm border p-0.5">
            {ENVIRONMENTS.map((env) => (
              <Link
                key={env}
                href={deploymentsHref(filters, { env })}
                aria-current={filters.env === env ? "true" : undefined}
                className={cn(
                  "rounded-sm px-2.5 py-1 font-mono text-[11px]",
                  filters.env === env
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {ENV_LABEL[env]}
              </Link>
            ))}
          </nav>
        </div>
        <nav aria-label="Status" className="flex flex-wrap items-center gap-1.5">
          <span className="text-subtle-foreground mr-1 font-mono text-[11px] uppercase">
            Status:
          </span>
          {STATUSES.map((status) => (
            <Link
              key={status}
              href={deploymentsHref(filters, { status })}
              aria-current={filters.status === status ? "true" : undefined}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-full border px-2.5 font-mono text-[11px]",
                filters.status === status
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              {STATUS_FILTER_LABEL[status]} ({counts[status]})
            </Link>
          ))}
        </nav>
      </div>

      <Panel title="Deployment activity" count={visible.length} meta="newest first">
        {repos.length === 0 ? (
          <PanelEmpty>
            No repositories connected.{" "}
            <Link href="/repositories" className="text-primary hover:underline">
              Connect one
            </Link>
            .
          </PanelEmpty>
        ) : visible.length === 0 ? (
          <PanelEmpty>No deployments match these filters.</PanelEmpty>
        ) : (
          <DeploymentTable rows={visible} now={now} />
        )}
      </Panel>
    </>
  );
}
