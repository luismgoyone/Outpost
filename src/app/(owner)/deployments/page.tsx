import { ComingSoon } from "@/components/shell/coming-soon";
import { requireOwner } from "@/lib/owner";

export const metadata = { title: "Deployments · Outpost" };

export default async function DeploymentsPage() {
  await requireOwner("/deployments");
  return (
    <ComingSoon
      title="Deployments"
      description="Production, staging and preview deployments across repositories."
      issue={4}
      features={[
        "Vercel and GitHub deployments in one table",
        "Filter by repo, environment and status",
        "Preview links back to their pull requests",
      ]}
    />
  );
}
