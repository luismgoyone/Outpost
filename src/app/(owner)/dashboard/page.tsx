import type { Metadata } from "next";
import Link from "next/link";

import { signOut } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getInstallUrl } from "@/lib/github/app";
import { listInstallableRepos } from "@/lib/github/installations";
import { requireOwner } from "@/lib/owner";
import { listConnectedRepos } from "@/lib/repos";

import { connectRepoAction } from "./actions";

export const metadata: Metadata = { title: "Dashboard · Outpost" };

export default async function DashboardPage() {
  const session = await requireOwner();
  const [connected, installable] = await Promise.all([
    listConnectedRepos(),
    listInstallableRepos(),
  ]);
  const connectedNames = new Set(connected.map((r) => `${r.owner}/${r.name}`));
  const available = installable.filter((r) => !connectedNames.has(r.fullName));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
          className="flex items-center gap-3"
        >
          <span className="text-muted-foreground text-sm">{session.user.login}</span>
          <Button variant="outline" size="sm" type="submit">
            Sign out
          </Button>
        </form>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Connected repositories</CardTitle>
          <CardDescription>Repos with an Outpost status page.</CardDescription>
        </CardHeader>
        <CardContent>
          {connected.length === 0 ? (
            <p className="text-muted-foreground text-sm">No repositories connected yet.</p>
          ) : (
            <ul aria-label="Connected repositories" className="divide-y">
              {connected.map((repo) => (
                <li key={repo.id} className="py-2">
                  <Link href={`/repos/${repo.id}`} className="font-medium hover:underline">
                    {repo.owner}/{repo.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connect a repository</CardTitle>
          <CardDescription>
            Repos the Outpost GitHub App can read.{" "}
            <a href={getInstallUrl()} className="underline underline-offset-4">
              Install the App on more repos
            </a>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          {available.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nothing new to connect. Install the App on a repo to see it here.
            </p>
          ) : (
            <ul aria-label="Available repositories" className="divide-y">
              {available.map((repo) => (
                <li key={repo.fullName} className="flex items-center justify-between gap-4 py-2">
                  <span className="flex items-center gap-2 font-medium">
                    {repo.fullName}
                    {repo.isPrivate && <Badge variant="outline">Private</Badge>}
                  </span>
                  <form action={connectRepoAction}>
                    <input type="hidden" name="fullName" value={repo.fullName} />
                    <Button size="sm" type="submit" aria-label={`Connect ${repo.fullName}`}>
                      Connect
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
