import { StatusBadge, type StatusTone } from "@/components/status-badge";
import type { CiStatus } from "@/lib/github/pull-requests";

const config: Record<CiStatus, { label: string; tone: StatusTone }> = {
  success: { label: "Passing", tone: "success" },
  failure: { label: "Failing", tone: "danger" },
  pending: { label: "Running", tone: "warning" },
  none: { label: "No checks", tone: "neutral" },
};

export function CiStatusBadge({ status }: { status: CiStatus }) {
  const { label, tone } = config[status];
  return <StatusBadge tone={tone} label={label} data-ci-status={status} />;
}
