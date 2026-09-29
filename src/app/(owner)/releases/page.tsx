import { cn } from "cn";
import {
  ExternalLink,
  GitCommitHorizontal,
  GitCompareArrows,
  GitMerge,
  Tag,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Markdown } from "@/components/markdown";
import { RepoChip } from "@/components/repo-chip";
import { PageHeader } from "@/components/shell/page-header";
import { StatusBadge } from "@/components/status-badge";
import { fetchAllReleases, type RepoRelease } from "@/lib/github/fetch-releases";
import { parseRange, RANGES, withinRange, type Range } from "@/lib/github/releases";
import { requireOwner } from "@/lib/owner";
import { listConnectedRepos } from "@/lib/repos";

export const metadata: Metadata = { title: "Releases · Outpost" };

const RANGE_LABEL: Record<Range, string> = {
  "30d": "30 days",
  "90d": "90 days",
  "1y": "1 year",
  all: "All time",
};
const dateFormat = new Intl.DateTimeFormat("en", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function href(repo: string | null, range: Range) {
  const params = new URLSearchParams();
  if (repo) params.set("repo", repo);
  if (range !== "90d") params.set("range", range);
  const q = params.toString();
  return q ? `/releases?${q}` : "/releases";
}

export default async function ReleasesPage(props: PageProps<"/releases">) {
  await requireOwner("/releases");
  const params = await props.searchParams;
  const repoFilter = (Array.isArray(params.repo) ? params.repo[0] : params.repo) || null;
  const range = parseRange(params.range);
  const now = new Date();

  const repos = await listConnectedRepos();
  const { items, errors } = await fetchAllReleases(repos);
  const visible = items.filter(
    (i) =>
      (!repoFilter || i.repo.name === repoFilter) && withinRange(i.release.publishedAt, range, now),
  );
  const repoNames = [...new Set(repos.map((r) => r.name))].sort();

  return (
    <>
      <PageHeader
        title="Releases & Changelogs"
        count={`${repos.length} repositories`}
        description={`Published releases and what went into them, across ${repos.length} repositories`}
      />

      {errors.length > 0 && (
        <div
          role="alert"
          className="border-warning/20 bg-warning/8 text-warning rounded-sm border px-3 py-2 font-mono text-[11px]"
        >
          Couldn&apos;t load releases for {errors.map((e) => e.repo.name).join(", ")}.
        </div>
      )}

      <div className="bg-card flex flex-wrap items-center gap-3 rounded-lg border p-3">
        <nav aria-label="Repository" className="flex flex-wrap gap-1">
          {[null, ...repoNames].map((name) => (
            <Link
              key={name ?? "all"}
              href={href(name, range)}
              aria-current={repoFilter === name ? "true" : undefined}
              className={cn(
                "rounded-sm px-2.5 py-1 font-mono text-[11px]",
                repoFilter === name
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {name ?? "All repos"}
            </Link>
          ))}
        </nav>
        <nav aria-label="Time range" className="bg-panel ml-auto flex rounded-sm border p-0.5">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={href(repoFilter, r)}
              aria-current={range === r ? "true" : undefined}
              className={cn(
                "rounded-sm px-2.5 py-1 font-mono text-[11px]",
                range === r
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {RANGE_LABEL[r]}
            </Link>
          ))}
        </nav>
      </div>

      {repos.length === 0 ? (
        <p className="text-muted-foreground text-[13px]">
          No repositories connected.{" "}
          <Link href="/repositories" className="text-primary hover:underline">
            Connect one
          </Link>
          .
        </p>
      ) : visible.length === 0 ? (
        <p className="text-muted-foreground text-[13px]">
          No releases in the last {RANGE_LABEL[range].toLowerCase()}.{" "}
          {range !== "all" && (
            <Link href={href(repoFilter, "all")} className="text-primary hover:underline">
              Show all time
            </Link>
          )}
        </p>
      ) : (
        <ol aria-label="Release timeline" className="relative flex flex-col gap-4 border-l pl-6">
          {visible.map((item) => (
            <ReleaseCard key={`${item.repo.id}:${item.release.id}`} item={item} />
          ))}
        </ol>
      )}
    </>
  );
}

function ReleaseCard({ item }: { item: RepoRelease }) {
  const { repo, release, changes } = item;
  return (
    <li aria-label={`${repo.name} ${release.tagName}`} className="relative">
      <span
        aria-hidden
        className={cn(
          "bg-background absolute top-5 -left-[31px] size-3 rounded-full border-2",
          release.isLatest ? "border-primary" : "border-subtle-foreground",
        )}
      />
      <article className="bg-card flex flex-col gap-3 rounded-lg border p-4">
        <header className="flex flex-wrap items-center gap-2.5">
          <Link href={`/repositories/${repo.id}`}>
            <RepoChip name={repo.name} />
          </Link>
          <h2 className="font-mono text-[15px] font-semibold">{release.tagName}</h2>
          {release.name !== release.tagName && (
            <span className="text-muted-foreground text-[13px]">{release.name}</span>
          )}
          {release.isLatest && <StatusBadge boxed tone="success" label="Latest" />}
          {release.isPrerelease && <StatusBadge boxed tone="warning" label="Pre-release" />}
          <span className="text-muted-foreground ml-auto text-xs">
            Published{" "}
            <time dateTime={release.publishedAt}>
              {dateFormat.format(new Date(release.publishedAt))}
            </time>
            {release.author && <span className="font-mono"> by @{release.author}</span>}
          </span>
        </header>

        {changes && (
          <p className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px]">
            <span className="inline-flex items-center gap-1">
              <GitMerge aria-hidden className="text-success size-3.5" />
              {plural(changes.pullRequests.length, "PR")} included
            </span>
            <span className="inline-flex items-center gap-1">
              <GitCommitHorizontal aria-hidden className="size-3.5" />
              {plural(changes.commits, "commit")}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users aria-hidden className="size-3.5" />
              {plural(changes.contributors.length, "contributor")}
            </span>
          </p>
        )}

        {release.notes.trim() ? (
          <div className="bg-background rounded-sm border px-4 py-3">
            <Markdown>{release.notes}</Markdown>
          </div>
        ) : (
          <p className="text-subtle-foreground text-[13px]">No release notes.</p>
        )}

        <footer className="flex flex-wrap items-center justify-end gap-4 text-[13px]">
          <a
            href={release.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:underline"
          >
            <Tag aria-hidden className="size-3.5" />
            View on GitHub
            <ExternalLink aria-hidden className="size-3" />
          </a>
          {changes && (
            <a
              href={changes.compareUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:underline"
            >
              <GitCompareArrows aria-hidden className="size-3.5" />
              Compare with {changes.previousTag}
            </a>
          )}
        </footer>
      </article>
    </li>
  );
}
