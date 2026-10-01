import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { RepoChip } from "@/components/repo-chip";
import { PageHeader } from "@/components/shell/page-header";
import { Panel, PanelEmpty } from "@/components/shell/panel";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getInstallUrl } from "@/lib/github/app";
import { listInstallableRepos } from "@/lib/github/installations";
import { requireOwner } from "@/lib/owner";
import { listConnectedRepos } from "@/lib/repos";

import { connectRepoAction } from "./actions";
import { ConnectButton } from "./connect-button";

export const metadata: Metadata = { title: "Repositories · Outpost" };

export default async function RepositoriesPage() {
  await requireOwner("/repositories");
  const [connected, installable] = await Promise.all([
    listConnectedRepos(),
    listInstallableRepos(),
  ]);
  const connectedNames = new Set(connected.map((r) => `${r.owner}/${r.name}`));
  const available = installable.filter((r) => !connectedNames.has(r.fullName));

  return (
    <>
      <PageHeader
        title="Repositories"
        count={`${connected.length} connected`}
        description="Repositories Outpost monitors, and the ones the GitHub App can see."
        actions={
          <a href={getInstallUrl()} className={buttonVariants({ variant: "outline" })}>
            <ExternalLink aria-hidden />
            Install on more repos
          </a>
        }
      />

      <Panel title="Connected repositories" count={connected.length}>
        {connected.length === 0 ? (
          <PanelEmpty>No repositories connected yet. Connect one below.</PanelEmpty>
        ) : (
          <ul aria-label="Connected repositories" className="divide-y">
            {connected.map((repo) => (
              <li
                key={repo.id}
                className="hover:bg-surface-hover/60 flex h-9 items-center gap-3 px-4 transition-colors duration-100"
              >
                <Link
                  href={`/repositories/${repo.id}`}
                  className="font-mono text-[12px] font-medium hover:underline"
                >
                  {repo.owner}/{repo.name}
                </Link>
                <a
                  href={`https://github.com/${repo.owner}/${repo.name}`}
                  className="text-subtle-foreground hover:text-foreground ml-auto inline-flex items-center gap-1 font-mono text-[11px]"
                >
                  GitHub
                  <ExternalLink aria-hidden className="size-3" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Available to connect" count={available.length} meta="via GitHub App">
        {available.length === 0 ? (
          <PanelEmpty>
            Nothing new to connect. Install the GitHub App on a repo to see it here.
          </PanelEmpty>
        ) : (
          <ul aria-label="Available repositories" className="divide-y">
            {available.map((repo) => (
              <li key={repo.fullName} className="flex h-10 items-center gap-3 px-4">
                <RepoChip name={repo.fullName} />
                {repo.isPrivate && <Badge variant="outline">Private</Badge>}
                <form action={connectRepoAction} className="ml-auto">
                  <input type="hidden" name="fullName" value={repo.fullName} />
                  <ConnectButton fullName={repo.fullName} />
                </form>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
