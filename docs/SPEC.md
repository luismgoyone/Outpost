# Outpost — product spec

## What Outpost is

A client-facing status page for a single GitHub repo. A freelance developer connects a
repo, and Outpost shows, on one page:

- **Repo stats**: open PRs, merge rate, recent commits
- **PR list** with CI status
- **Deployments and preview links** from Vercel
- **Releases** with their changelog

The key feature is a **read-only share link** that a client can open without logging in to
see what shipped this week, which previews are ready to review, and what is in progress.

## Users

- **Owner**: the developer. Signs in with GitHub (Auth.js), connects a repo through the
  GitHub App, links a Vercel project, and creates or revokes share links.
- **Client**: anyone holding a share link. No account and no login. Read-only.

## Tech stack

- Next.js (App Router) + TypeScript (strict), pnpm
- Tailwind CSS + shadcn/ui, Recharts for charts
- GitHub App for repo access (so share links work without the viewer logging in);
  Octokit with GraphQL for PRs/stats and REST for releases
- Vercel REST API for deployments and previews
- Postgres (Neon) + Drizzle ORM for connected repos, share links, and cached stats
- Auth.js with GitHub provider, for the owner only
- Vitest for unit tests, Playwright for end-to-end tests (video on failure)
- ESLint + Prettier
- Deploy target: Vercel

## Security model

- Share tokens are 256-bit random values in base64url. Only a SHA-256 hash is stored, and
  tokens are compared in constant time.
- A share link can be revoked (`revoked_at`). A revoked link returns 404, just like an
  unknown one.
- Share pages never expose owner data beyond the connected repo, and never make GitHub
  calls using the viewer's identity.

## MVP milestones

1. **Connect a repo** via the GitHub App and list its open and merged PRs with CI status.
2. **Read-only share link**: an unguessable token that can be revoked, no login needed.
3. **Deployments and preview links** from Vercel.
4. **Releases** with changelog.
5. **Stats charts**: merge rate, PRs per week.
6. **Cache GitHub data in Postgres**; later, GitHub webhooks for live updates.

Each milestone is tracked as a GitHub issue.
