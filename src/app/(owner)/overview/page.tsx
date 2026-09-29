import { ComingSoon } from "@/components/shell/coming-soon";
import { requireOwner } from "@/lib/owner";

export const metadata = { title: "Overview · Outpost" };

export default async function OverviewPage() {
  await requireOwner("/overview");
  return (
    <ComingSoon
      title="Overview"
      description="Repository health, CI and blockers at a glance."
      issue={6}
      features={[
        "Attention cards: stale PRs, failing CI, waiting for review, failed deployments",
        "A card per repo: open PRs, main-branch CI, last production deploy, latest release",
        "Pull requests per week sparkline for each repo",
      ]}
    />
  );
}
