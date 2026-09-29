import { StatusBadge, type StatusTone } from "@/components/status-badge";
import type { PullRequest } from "@/lib/github/pull-requests";

export function ReviewStatusBadge({ pr }: { pr: Pick<PullRequest, "reviewState" | "approvals"> }) {
  const { label, tone } = describe(pr);
  return <StatusBadge tone={tone} label={label} data-review-state={pr.reviewState} />;
}

function describe({ reviewState, approvals }: Pick<PullRequest, "reviewState" | "approvals">): {
  label: string;
  tone: StatusTone;
} {
  switch (reviewState) {
    case "draft":
      return { label: "Draft", tone: "neutral" };
    case "approved":
      return { label: approvals > 1 ? `${approvals} approvals` : "Approved", tone: "success" };
    case "changes_requested":
      return { label: "Changes requested", tone: "danger" };
    default:
      return approvals > 0
        ? { label: `${approvals} approved`, tone: "info" }
        : { label: "Awaiting review", tone: "warning" };
  }
}
