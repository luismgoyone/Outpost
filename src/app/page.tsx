import { ArrowRight, Box, GitPullRequest, Rocket, Tag, UserRound } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

const features = [
  {
    icon: UserRound,
    title: "My Work",
    description: "PRs waiting on your review, your PRs, stale and failing work.",
  },
  {
    icon: GitPullRequest,
    title: "Pull requests",
    description: "Every open PR across your repos, with CI and review state.",
  },
  {
    icon: Rocket,
    title: "Deployments",
    description: "Production, staging and preview deploys in one place.",
  },
  {
    icon: Tag,
    title: "Releases",
    description: "What shipped where, with changelogs across repos.",
  },
];

export default async function Home(props: PageProps<"/">) {
  const { error } = await props.searchParams;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-10 px-4 py-20 sm:px-6">
      <header className="flex flex-col gap-4">
        <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-sm">
          <Box aria-hidden className="size-4.5" />
        </span>
        <h1 className="text-2xl leading-8 font-semibold tracking-[-0.02em]">Outpost</h1>
        <p className="text-muted-foreground max-w-xl text-sm leading-5">
          Your personal engineering control center. Everything that needs you across your GitHub
          repos, in one dense dashboard.
        </p>
        {error === "not-owner" && (
          <p role="alert" className="text-destructive font-mono text-[12px]">
            That GitHub account isn&apos;t the owner of this Outpost.
          </p>
        )}
        <Link href="/repositories" className={buttonVariants({ className: "w-fit" })}>
          Open Outpost
          <ArrowRight aria-hidden />
        </Link>
      </header>
      <section aria-label="Features" className="grid gap-3 sm:grid-cols-2">
        {features.map(({ icon: Icon, title, description }) => (
          <div key={title} className="bg-card flex flex-col gap-1.5 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Icon aria-hidden className="text-primary size-4" />
              <h2 className="text-[15px] font-semibold">{title}</h2>
            </div>
            <p className="text-muted-foreground text-[13px]">{description}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
