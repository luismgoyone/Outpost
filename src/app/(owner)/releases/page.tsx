import { cn } from "cn";
import type { Metadata } from "next";
import Link from "next/link";

import { ReleaseCard } from "@/components/release-card";
import { PageHeader } from "@/components/shell/page-header";
import { fetchAllReleases } from "@/lib/github/fetch-releases";
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
