import { Box, LogOut } from "lucide-react";
import Link from "next/link";

import { auth, isOwner, signOut } from "@/auth";
import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { SyncControl } from "@/components/shell/sync-control";
import { oldestSync, readAllCached } from "@/lib/cache";
import { syncedLabel } from "@/lib/cache-policy";
import type { RepoPullRequests } from "@/lib/github/pull-requests";
import { buildMyWork } from "@/lib/my-work";
import { listConnectedRepos } from "@/lib/repos";

import { syncNowAction } from "./actions";

/**
 * App shell for owner pages. Every page still calls requireOwner() itself; the layout only
 * reads data when the viewer is the owner, so it never renders repo names for anyone else.
 */
export default async function OwnerLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  const owner = isOwner(session?.user?.login);
  const repos = owner ? await listConnectedRepos() : [];
  const now = new Date();

  // Badges come from cached snapshots only, so rendering the shell never calls GitHub.
  const [cachedPulls, lastSync] = owner
    ? await Promise.all([readAllCached<RepoPullRequests>("pulls"), oldestSync()])
    : [[], null];
  const byId = new Map(repos.map((r) => [r.id, r]));
  const snapshots = cachedPulls.flatMap(({ repoId, data }) => {
    const repo = byId.get(repoId);
    return repo
      ? [{ repoId, repoName: repo.name, open: data.open, defaultBranch: data.defaultBranch }]
      : [];
  });
  const counts: Record<string, number> = { "/repositories": repos.length };
  if (snapshots.length > 0) {
    counts["/pull-requests"] = snapshots.reduce((n, s) => n + s.open.length, 0);
    counts["/my-work"] = buildMyWork(snapshots, session?.user?.login, now).attentionCount;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="bg-panel sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r p-3 max-md:hidden">
        <Link href="/repositories" className="flex items-center gap-2.5 px-1 py-1">
          <span className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-sm">
            <Box aria-hidden className="size-3.5" />
          </span>
          <span className="flex flex-col">
            <span className="text-[15px] leading-none font-semibold tracking-[-0.01em]">
              Outpost
            </span>
            <span className="text-muted-foreground mt-0.5 font-mono text-[10px]">
              Control Center
            </span>
          </span>
        </Link>

        <div className="mt-5">
          <SidebarNav counts={counts} />
        </div>

        <div className="mt-auto flex flex-col gap-3">
          {repos.length > 0 && (
            <div className="border-t pt-3">
              <p className="text-subtle-foreground px-2 pb-1.5 font-mono text-[10px] tracking-wider uppercase">
                Repositories
              </p>
              <ul aria-label="Sidebar repositories" className="flex flex-col gap-0.5">
                {repos.slice(0, 8).map((repo) => (
                  <li key={repo.id}>
                    <Link
                      href={`/repositories/${repo.id}`}
                      className="text-muted-foreground hover:bg-surface-hover/60 hover:text-foreground block truncate rounded-sm px-2.5 py-1 font-mono text-[11px]"
                    >
                      {repo.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {owner && session?.user && (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
              className="flex items-center gap-2 border-t px-1 pt-3"
            >
              <span className="bg-surface-hover text-muted-foreground flex size-6 items-center justify-center rounded-full font-mono text-[10px] uppercase">
                {session.user.login?.slice(0, 2)}
              </span>
              <span className="truncate font-mono text-[11px]">{session.user.login}</span>
              <button
                type="submit"
                aria-label="Sign out"
                title="Sign out"
                className="text-subtle-foreground hover:text-foreground hover:bg-surface-hover ml-auto rounded-sm p-1"
              >
                <LogOut aria-hidden className="size-3.5" />
              </button>
            </form>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/80 sticky top-0 z-10 flex h-11 items-center gap-3 border-b px-4 backdrop-blur">
          <Breadcrumbs />
          {owner && <SyncControl label={syncedLabel(lastSync, now)} action={syncNowAction} />}
        </header>
        <main className="flex w-full flex-1 flex-col gap-6 px-4 py-6 sm:px-6 2xl:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
