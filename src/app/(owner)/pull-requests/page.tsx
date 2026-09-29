import { ComingSoon } from "@/components/shell/coming-soon";
import { requireOwner } from "@/lib/owner";

export const metadata = { title: "Pull Requests · Outpost" };

export default async function PullRequestsPage() {
  await requireOwner("/pull-requests");
  return (
    <ComingSoon
      title="Pull Requests"
      description="Every open pull request across your repositories."
      issue={12}
      features={[
        "One table across all connected repos with CI status, review state and age",
        "Filters: repo, author, mine, needs review, stale, failing CI",
        "Stale pull requests highlighted",
      ]}
    />
  );
}
