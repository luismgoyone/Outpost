import { CheckCircle2, CircleDashed, Clock, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { CiStatus } from "@/lib/github/pull-requests";

const config = {
  success: {
    label: "Passing",
    variant: "secondary",
    Icon: CheckCircle2,
    className: "text-emerald-600 dark:text-emerald-400",
  },
  failure: { label: "Failing", variant: "destructive", Icon: XCircle, className: "" },
  pending: {
    label: "Running",
    variant: "outline",
    Icon: Clock,
    className: "text-amber-600 dark:text-amber-400",
  },
  none: {
    label: "No checks",
    variant: "outline",
    Icon: CircleDashed,
    className: "text-muted-foreground",
  },
} as const;

export function CiStatusBadge({ status }: { status: CiStatus }) {
  const { label, variant, Icon, className } = config[status];
  return (
    <Badge variant={variant} data-ci-status={status}>
      <Icon aria-hidden className={className} />
      {label}
    </Badge>
  );
}
