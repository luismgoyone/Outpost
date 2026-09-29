import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { auth, isOwner } from "@/auth";
import { PullRequestTable } from "@/components/pull-request-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchPullRequests } from "@/lib/github/fetch-pull-requests";
import { requireOwner } from "@/lib/owner";
import { getConnectedRepo } from "@/lib/repos";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata(props: PageProps<"/repos/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  // Metadata renders independently of the page, so gate it too: no repo names for visitors.
  const session = await auth();
  if (!isOwner(session?.user?.login)) return { title: "Outpost" };
  const repo = UUID.test(id) ? await getConnectedRepo(id) : undefined;
  return { title: repo ? `${repo.owner}/${repo.name} · Outpost` : "Outpost" };
}

export default async function RepoPage(props: PageProps<"/repos/[id]">) {
  const { id } = await props.params;
  await requireOwner(`/repos/${id}`);

  const repo = UUID.test(id) ? await getConnectedRepo(id) : undefined;
  if (!repo) notFound();

  const { open, merged } = await fetchPullRequests(repo);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-1">
        <Link href="/dashboard" className="text-muted-foreground text-sm hover:underline">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {repo.owner}/{repo.name}
        </h1>
      </header>

      <Card role="region" aria-labelledby="open-prs">
        <CardHeader>
          <CardTitle id="open-prs">Open pull requests</CardTitle>
          <CardDescription>{open.length} open, most recently updated first.</CardDescription>
        </CardHeader>
        <CardContent>
          <PullRequestTable
            pullRequests={open}
            dateField="updatedAt"
            dateLabel="Updated"
            emptyMessage="No open pull requests."
          />
        </CardContent>
      </Card>

      <Card role="region" aria-labelledby="merged-prs">
        <CardHeader>
          <CardTitle id="merged-prs">Recently merged</CardTitle>
          <CardDescription>The last {merged.length} merged pull requests.</CardDescription>
        </CardHeader>
        <CardContent>
          <PullRequestTable
            pullRequests={merged}
            dateField="mergedAt"
            dateLabel="Merged"
            emptyMessage="Nothing merged yet."
          />
        </CardContent>
      </Card>
    </main>
  );
}
