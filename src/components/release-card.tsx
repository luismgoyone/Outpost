import { cn } from "cn";
import {
  ExternalLink,
  GitCommitHorizontal,
  GitCompareArrows,
  GitMerge,
  Tag,
  Users,
} from "lucide-react";
import Link from "next/link";

import { Markdown } from "@/components/markdown";
import { RepoChip } from "@/components/repo-chip";
import { StatusBadge } from "@/components/status-badge";
import type { RepoRelease } from "@/lib/github/fetch-releases";

const dateFormat = new Intl.DateTimeFormat("en", {
  month: "long",
  day: "numeric",
  year: "numeric",
});
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function ReleaseCard({ item }: { item: RepoRelease }) {
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
