import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  { title: "Pull requests", description: "Open and merged PRs with CI status." },
  { title: "Previews", description: "Vercel deployments and preview links, ready to review." },
  { title: "Releases", description: "What shipped, with the changelog." },
  { title: "Share link", description: "A read-only page your client opens without logging in." },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-20 sm:px-6">
      <header className="flex flex-col gap-4">
        <Badge variant="secondary" className="w-fit">
          In development
        </Badge>
        <h1 className="text-4xl font-semibold tracking-tight">Outpost</h1>
        <p className="text-muted-foreground max-w-xl text-lg">
          A client-facing status page for your GitHub repo. Share what shipped this week, which
          previews are ready to review, and what&apos;s in progress.
        </p>
      </header>
      <section aria-label="Features" className="grid gap-4 sm:grid-cols-2">
        {features.map((f) => (
          <Card key={f.title}>
            <CardHeader>
              <CardTitle>{f.title}</CardTitle>
              <CardDescription>{f.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>
    </main>
  );
}
