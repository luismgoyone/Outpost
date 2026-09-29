import { ComingSoon } from "@/components/shell/coming-soon";
import { requireOwner } from "@/lib/owner";

export const metadata = { title: "My Work · Outpost" };

export default async function MyWorkPage() {
  await requireOwner("/my-work");
  return (
    <ComingSoon
      title="My Work"
      description="Your personal inbox across every connected repository."
      issue={13}
      features={[
        "Pull requests waiting on your review",
        "Your pull requests with review state and CI status",
        "Stale pull requests in your repos (open more than 7 days)",
        "Failed workflow runs and deployments",
      ]}
    />
  );
}
