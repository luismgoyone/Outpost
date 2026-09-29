import { cn } from "cn";
import { ExternalLink, Folder, Lock, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { CiStatusBadge } from "@/components/ci-status-badge";
import { PageHeader } from "@/components/shell/page-header";
import { Sparkline } from "@/components/sparkline";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { fetchAllPullRequests } from "@/lib/github/fetch-all-pull-requests";
import { requireOwner } from "@/lib/owner";
import { buildOverview, type AttentionCard, type RepoOverview } from "@/lib/overview";
import { listConnectedRepos } from "@/lib/repos";

export const metadata: Metadata = { title: "Overview · Outpost" };

export default async function OverviewPage(props: PageProps<"/overview">) {
  await requireOwner("/overview");
  const { q } = await props.searchParams;
  const query = (Array.isArray(q) ? q[0] : q)?.trim().toLowerCase() ?? "";
  const now = new Date();

  const repos = await listConnectedRepos();
  const { results, errors } = await fetchAllPullRequests(repos);
  const overview = buildOverview(
    results.map(({ repo, ...data }) => ({ repo, data })),
    now,
  );
  const visibleRepos = overview.repos.filter((r) => r.repo.name.toLowerCase().includes(query));
  const healthy =
    errors.length === 0 && overview.failingCi.count === 0 && overview.stale.count === 0;

  return (
    <>
      <PageHeader
        title="Engineering Overview"
        description={`Repository health, CI and blockers across ${repos.length} connected repositories`}
        actions={
          <>
            <span className="bg-panel text-muted-foreground rounded-sm border px-1.5 py-0.5 font-mono text-[11px] uppercase">
              {repos.length} repositories connected
            </span>
            <StatusBadge
              boxed
              tone={healthy ? "success" : "warning"}
              label={healthy ? "ALL CLEAR" : "NEEDS ATTENTION"}
            />
          </>
        }
      />

      {errors.length > 0 && (
        <div
          role="alert"
          className="border-warning/20 bg-warning/8 text-warning rounded-sm border px-3 py-2 font-mono text-[11px]"
        >
          Couldn&apos;t load {errors.map((e) => e.repo.name).join(", ")}. Check the GitHub App still
          has access.
        </div>
      )}

      <section aria-label="Attention" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AttentionTile
          title="Stale PRs (>7d)"
          tag="Highest risk"
          tone="warning"
          caption="blocking velocity"
          card={overview.stale}
          empty="No stale pull requests"
        />
        <AttentionTile
          title="Failing CI"
          tag="Main & PRs"
          tone="danger"
          caption="active failures"
          card={overview.failingCi}
          empty="Everything is green"
        />
        <AttentionTile
          title="Waiting for review"
          tag={
            overview.waitingForReview.avgWaitDays === null
              ? undefined
              : `Avg wait ${overview.waitingForReview.avgWaitDays.toFixed(1)}d`
          }
          tone="info"
          caption="pending sign-off"
          card={overview.waitingForReview}
          empty="Nothing awaiting review"
        />
        <section
          aria-label="Failed deployments"
          className="bg-card flex flex-col gap-3 rounded-lg border p-4"
        >
          <h2 className="text-subtle-foreground font-mono text-[11px] tracking-wider uppercase">
            Failed deployments
          </h2>
          <p className="text-muted-foreground text-[13px]">
            Deployments aren&apos;t connected yet.
          </p>
          <Link
            href="/deployments"
            className="text-primary mt-auto font-mono text-[11px] hover:underline"
          >
            Set up in Deployments →
          </Link>
        </section>
      </section>

      <section aria-labelledby="repos-heading" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="repos-heading" className="text-lg leading-6 font-semibold tracking-[-0.015em]">
            Repositories
          </h2>
          <span className="bg-panel text-muted-foreground rounded-sm px-1.5 font-mono text-[11px]">
            {overview.repos.length} active
          </span>
          <form role="search" className="relative ml-auto">
            <Search
              aria-hidden
              className="text-subtle-foreground absolute top-2 left-2.5 size-3.5"
            />
            <input
              type="search"
              name="q"
              defaultValue={query}
              aria-label="Filter repositories"
              placeholder="Filter repositories…"
              className="bg-background focus:border-primary h-8 w-56 rounded-sm border pr-2 pl-8 text-[13px] outline-none"
            />
          </form>
          <span className="text-subtle-foreground font-mono text-[11px]">
            Sort: <span className="text-foreground">Needs attention</span>
          </span>
        </div>

        {repos.length === 0 ? (
          <p className="text-muted-foreground text-[13px]">
            No repositories connected.{" "}
            <Link href="/repositories" className="text-primary hover:underline">
              Connect one
            </Link>
            .
          </p>
        ) : visibleRepos.length === 0 ? (
          <p className="text-muted-foreground text-[13px]">No repositories match “{query}”.</p>
        ) : (
          <ul aria-label="Repository health" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {visibleRepos.map((r) => (
              <RepoCard key={r.repo.id} overview={r} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

const TAG_TONES: Record<"warning" | "danger" | "info", string> = {
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
  info: "border-primary/30 bg-primary/10 text-primary",
};

function AttentionTile({
  title,
  tag,
  tone,
  caption,
  card,
  empty,
}: {
  title: string;
  tag?: string;
  tone: "warning" | "danger" | "info";
  caption: string;
  card: AttentionCard;
  empty: string;
}) {
  const numberTone = { warning: "text-warning", danger: "text-destructive", info: "text-primary" }[
    tone
  ];
  return (
    <section aria-label={title} className="bg-card flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-subtle-foreground font-mono text-[11px] tracking-wider uppercase">
          {title}
        </h2>
        {tag && (
          <span
            className={cn("rounded-sm border px-1.5 py-0.5 font-mono text-[10px]", TAG_TONES[tone])}
          >
            {tag}
          </span>
        )}
      </div>
      <p className="flex items-baseline gap-2">
        <span
          className={cn(
            "text-2xl font-semibold tabular-nums",
            card.count > 0 ? numberTone : "text-foreground",
          )}
        >
          {card.count}
        </span>
        <span className="text-muted-foreground text-[13px]">
          {card.count > 0 ? caption : empty}
        </span>
      </p>
      {card.items.length > 0 && (
        <ul className="flex flex-col gap-1 border-t pt-3 font-mono text-[12px]">
          {card.items.map((item) => (
            <li key={item.label} className="flex justify-between gap-2">
              <Link href={`/repositories/${item.repoId}`} className="truncate hover:underline">
                {item.label}
              </Link>
              <span className={numberTone}>{item.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RepoCard({ overview }: { overview: RepoOverview }) {
  const { repo, data, openCount, staleCount, weekly, mergeRate } = overview;
  const release = data.meta.latestRelease;
  const lastWeek = weekly.at(-1)?.count ?? 0;
  const mergeTone: StatusTone =
    mergeRate === null
      ? "neutral"
      : mergeRate >= 0.7
        ? "success"
        : mergeRate >= 0.4
          ? "warning"
          : "danger";

  return (
    <li
      aria-label={repo.name}
      className="bg-card flex flex-col gap-3 rounded-lg border p-4 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.05)]"
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/repositories/${repo.id}`}
          className="flex min-w-0 items-center gap-2 text-[15px] font-semibold hover:underline"
        >
          <Folder aria-hidden className="text-primary size-4 shrink-0" />
          <span className="truncate">{repo.name}</span>
        </Link>
        {release && (
          <a
            href={release.url}
            className="bg-panel text-muted-foreground hover:text-foreground shrink-0 rounded-sm border px-1.5 py-0.5 font-mono text-[11px]"
          >
            {release.tagName}
          </a>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {data.meta.primaryLanguage && (
          <span className="border-primary/20 bg-primary/8 text-primary rounded-sm border px-1.5 py-0.5 font-mono text-[11px]">
            {data.meta.primaryLanguage.name}
          </span>
        )}
        {data.meta.isPrivate && (
          <span className="text-subtle-foreground inline-flex items-center gap-1 font-mono text-[11px]">
            <Lock aria-hidden className="size-3" />
            private
          </span>
        )}
        {data.defaultBranch && (
          <span className="text-subtle-foreground ml-auto font-mono text-[11px]">
            sha:{data.defaultBranch.sha.slice(0, 7)}
          </span>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-y-3 border-t pt-3">
        <div>
          <dt className="text-subtle-foreground font-mono text-[11px]">Open PRs</dt>
          <dd className="font-mono text-[12px]">
            {openCount} open
            {staleCount > 0 && <span className="text-warning"> ({staleCount} stale)</span>}
          </dd>
        </div>
        <div>
          <dt className="text-subtle-foreground font-mono text-[11px]">
            {data.defaultBranch?.name ?? "Main"} CI
          </dt>
          <dd>
            <CiStatusBadge status={data.defaultBranch?.ciStatus ?? "none"} />
          </dd>
        </div>
        <div>
          <dt className="text-subtle-foreground font-mono text-[11px]">Merge rate (30d)</dt>
          <dd>
            <StatusBadge
              tone={mergeTone}
              label={mergeRate === null ? "—" : `${Math.round(mergeRate * 100)}%`}
            />
          </dd>
        </div>
        <div className="flex flex-col items-end">
          <dt className="text-subtle-foreground font-mono text-[11px]">{lastWeek} PRs/wk</dt>
          <dd>
            <Sparkline data={weekly} label={`${repo.name}: pull requests opened per week`} />
          </dd>
        </div>
      </dl>

      <div className="mt-auto flex items-center justify-between border-t pt-3">
        <a
          href={`https://github.com/${repo.owner}/${repo.name}`}
          className="text-subtle-foreground hover:text-foreground inline-flex items-center gap-1 font-mono text-[11px]"
        >
          <ExternalLink aria-hidden className="size-3" />
          GitHub
        </a>
        <Link
          href={`/repositories/${repo.id}`}
          className={buttonVariants({ size: "sm", variant: "outline" })}
        >
          View details
        </Link>
      </div>
    </li>
  );
}
