import { ComingSoon } from "@/components/shell/coming-soon";
import { requireOwner } from "@/lib/owner";

export const metadata = { title: "Releases · Outpost" };

export default async function ReleasesPage() {
  await requireOwner("/releases");
  return (
    <ComingSoon
      title="Releases"
      description="Release timeline and changelogs across repositories."
      issue={5}
      features={[
        "Releases from every connected repo, newest first",
        "Included pull requests, commits and contributors per release",
        "Rendered release notes with links to compare tags",
      ]}
    />
  );
}
