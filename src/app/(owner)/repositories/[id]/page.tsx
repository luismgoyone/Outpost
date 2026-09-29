import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { auth, isOwner } from "@/auth";
import { PullRequestTable } from "@/components/pull-request-table";
import { PageHeader } from "@/components/shell/page-header";
import { Panel } from "@/components/shell/panel";
import { buttonVariants } from "@/components/ui/button";
import { fetchPullRequests } from "@/lib/github/fetch-pull-requests";
import { requireOwner } from "@/lib/owner";
import { getConnectedRepo } from "@/lib/repos";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TABS = [
  { label: "Pull Requests", ready: true },
  { label: "Workflows", ready: false },
  { label: "Deployments", ready: false },
  { label: "Releases", ready: false },
];

export async function generateMetadata(props: PageProps<"/repositories/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  // Metadata renders independently of the page, so gate it too: no repo names for visitors.
  const session = await auth();
  if (!isOwner(session?.user?.login)) return { title: "Outpost" };
  const repo = UUID.test(id) ? await getConnectedRepo(id) : undefined;
  return { title: repo ? `${repo.owner}/${repo.name} · Outpost` : "Outpost" };
}

export default async function RepoPage(props: PageProps<"/repositories/[id]">) {
  const { id } = await props.params;
  await requireOwner(`/repositories/${id}`);

  const repo = UUID.test(id) ? await getConnectedRepo(id) : undefined;
  if (!repo) notFound();

  // A repo can lose App access after it's connected; show that instead of crashing the page.
  const result = await fetchPullRequests(repo).then(
    (data) => ({ ok: true as const, ...data }),
    (error: unknown) => ({
      ok: false as const,
      message: String((error as Error)?.message ?? error),
    }),
  );
  const open = result.ok ? result.open : [];
  const merged = result.ok ? result.merged : [];
  const githubUrl = `https://github.com/${repo.owner}/${repo.name}`;

  return (
    <>
      <PageHeader
        title={`${repo.owner}/${repo.name}`}
        count={`${open.length} open PRs`}
        actions={
          <a href={githubUrl} className={buttonVariants({ variant: "outline" })}>
            <ExternalLink aria-hidden />
            GitHub
          </a>
        }
      />

      <div role="tablist" aria-label="Repository sections" className="-mt-2 flex gap-5 border-b">
        {TABS.map((tab) => (
          <span
            key={tab.label}
            role="tab"
            aria-selected={tab.ready}
            aria-disabled={!tab.ready}
            className={
              tab.ready
                ? "border-primary text-foreground -mb-px border-b-2 pb-2.5 text-sm font-medium"
                : "text-subtle-foreground pb-2.5 text-sm"
            }
          >
            {tab.label}
            {!tab.ready && <span className="ml-1.5 font-mono text-[10px]">soon</span>}
          </span>
        ))}
      </div>

      {!result.ok && (
        <div
          role="alert"
          className="border-warning/20 bg-warning/8 text-warning rounded-sm border px-3 py-2 font-mono text-[11px]"
        >
          Couldn&apos;t load pull requests from GitHub. Check the GitHub App still has access to
          this repo.
        </div>
      )}

      <Panel title="Open pull requests" count={open.length} meta="most recently updated">
        <PullRequestTable
          pullRequests={open}
          dateField="updatedAt"
          dateLabel="Updated"
          emptyMessage="No open pull requests."
        />
      </Panel>

      <Panel title="Recently merged" count={merged.length} meta="newest merge first">
        <PullRequestTable
          pullRequests={merged}
          dateField="mergedAt"
          dateLabel="Merged"
          emptyMessage="Nothing merged yet."
        />
      </Panel>
    </>
  );
}
