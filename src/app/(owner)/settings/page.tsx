import { ComingSoon } from "@/components/shell/coming-soon";
import { requireOwner } from "@/lib/owner";

export const metadata = { title: "Settings · Outpost" };

export default async function SettingsPage() {
  await requireOwner("/settings");
  return (
    <ComingSoon
      title="Settings"
      description="Connected accounts, and later, alert rules."
      issue={16}
      features={[
        "Connected accounts: GitHub App installations and Vercel",
        "Alert rules: stale PR digest, CI failing on main, failed production deploys",
        "Slack and Linear integrations",
      ]}
    />
  );
}
