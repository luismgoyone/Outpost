import { cn } from "cn";
import { GitMerge, Hand, HelpCircle, Tag } from "lucide-react";

import { strategyLabel, type Strategy } from "@/lib/github/deploy-strategy";
import type { Shipping } from "@/lib/github/fetch-deploy-strategy";

const ICON: Record<Strategy, typeof GitMerge> = {
  merge: GitMerge,
  tag: Tag,
  manual: Hand,
  unknown: HelpCircle,
};

const TONE: Record<Strategy, string> = {
  merge: "border-primary/20 bg-primary/8 text-primary",
  tag: "border-warning/20 bg-warning/8 text-warning",
  manual: "border-neutral/20 bg-neutral/8 text-muted-foreground",
  unknown: "border-neutral/20 bg-neutral/8 text-subtle-foreground",
};

/** "Merge to main · Vercel" / "Release tag · Netlify", with the evidence as a tooltip. */
export function ShippingBadge({ shipping, className }: { shipping: Shipping; className?: string }) {
  const Icon = ICON[shipping.strategy];
  return (
    <span
      title={shipping.reason}
      data-strategy={shipping.strategy}
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap",
        TONE[shipping.strategy],
        className,
      )}
    >
      <Icon aria-hidden className="size-3" />
      {strategyLabel(shipping.strategy, shipping.defaultBranch)}
      {shipping.platform && <span className="opacity-70">· {shipping.platform}</span>}
    </span>
  );
}

/** "24 commits not released since v1.2.0", linking to the compare view. */
export function UnreleasedNote({ shipping }: { shipping: Shipping }) {
  const u = shipping.unreleased;
  if (!u) return null;
  if (u.commits === 0) {
    return <span className="text-success font-mono text-[11px]">All released ({u.sinceTag})</span>;
  }
  return (
    <a
      href={u.compareUrl}
      target="_blank"
      rel="noreferrer"
      className="text-warning font-mono text-[11px] hover:underline"
    >
      {u.commits} commit{u.commits === 1 ? "" : "s"}
      {u.pullRequests.length > 0 &&
        ` (${u.pullRequests.length} PR${u.pullRequests.length === 1 ? "" : "s"})`}{" "}
      not released since {u.sinceTag}
    </a>
  );
}
