# Outpost

A client-facing status page for a single GitHub repo. Connect a repo, and Outpost shows your
PRs with CI status, Vercel deployments and preview links, releases with changelogs, and repo
stats on one page. Then send your client a **read-only share link**: they see what shipped
this week, which previews are ready to review, and what's in progress, without logging in.

![Outpost screenshot](docs/images/screenshot.png)

> Screenshot coming soon. See [docs/SPEC.md](docs/SPEC.md) for the product spec and milestones.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS + shadcn/ui · Recharts · GitHub App (Octokit) ·
Vercel REST API · Neon Postgres + Drizzle · Auth.js · Vitest · Playwright

## Local setup

Requirements: Node.js 22+ (24 recommended), pnpm 11, and the `gh` CLI for repo tooling.

```bash
pnpm install
cp .env.example .env.local   # then fill in the values below
pnpm exec playwright install chromium   # once, for e2e tests
pnpm db:migrate              # once DATABASE_URL is set
pnpm dev                     # http://localhost:3000
```

Then open `/dashboard`, sign in with GitHub as `OWNER_GITHUB_LOGIN`, and connect a repo the
GitHub App is installed on.

### End-to-end tests

E2E tests never touch GitHub or your real database. They run the app against a mock GitHub
API (`tests/e2e/support/mock-github.mts`) and a throwaway Postgres in Docker, and sign in by
minting an Auth.js session cookie.

```bash
pnpm e2e:db     # start the e2e Postgres container (port 54329), once per boot
pnpm test:e2e   # app on :3100, mock GitHub on :4010
```

## Environment variables

All of them are listed with comments in [`.env.example`](.env.example).

| Variable                                | Purpose                                            |
| --------------------------------------- | -------------------------------------------------- |
| `GITHUB_APP_ID`                         | GitHub App ID                                      |
| `GITHUB_APP_PRIVATE_KEY`                | GitHub App private key (PEM)                       |
| `GITHUB_APP_SLUG`                       | App slug, for the install link                     |
| `GITHUB_WEBHOOK_SECRET`                 | Verifies GitHub webhook payloads                   |
| `GITHUB_API_URL`                        | Optional GitHub API base URL (GHES, or e2e mock)   |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth client for owner sign-in              |
| `AUTH_SECRET`                           | Auth.js session secret (`openssl rand -base64 32`) |
| `OWNER_GITHUB_LOGIN`                    | The only GitHub user allowed to sign in            |
| `VERCEL_TOKEN`                          | Vercel API token for deployments and previews      |
| `VERCEL_TEAM_ID`                        | Optional Vercel team ID                            |
| `DATABASE_URL`                          | Neon Postgres connection string                    |

## Scripts

| Script             | What it does                                                  |
| ------------------ | ------------------------------------------------------------- |
| `pnpm dev`         | Start the dev server                                          |
| `pnpm build`       | Production build                                              |
| `pnpm lint`        | ESLint                                                        |
| `pnpm typecheck`   | Generate route types, then `tsc --noEmit`                     |
| `pnpm test`        | Unit tests (Vitest)                                           |
| `pnpm test:e2e`    | End-to-end tests (Playwright, video retained on failure)      |
| `pnpm e2e:db`      | Start the Docker Postgres used by e2e tests                   |
| `pnpm format`      | Format with Prettier (`format:check` to verify only)          |
| `pnpm db:generate` | Generate a Drizzle migration from `src/db/schema.ts`          |
| `pnpm db:migrate`  | Apply migrations to `DATABASE_URL`                            |
| `pnpm sync-repo`   | Apply `repo.config.json` and repo settings to GitHub via `gh` |

## Contributing

Work on a branch and open a PR. CI must pass before merging. `main` is protected and
squash-merge only.
