@AGENTS.md

# Outpost: project conventions

Outpost is a client-facing status page for one GitHub repo, with a read-only share link.
The product spec and milestones live in `docs/SPEC.md`. Read it before starting feature work.

## Stack

Next.js 16 (App Router, `src/`), TypeScript strict, pnpm 11, Tailwind v4 + shadcn/ui
(`base-nova` style, `cn` from `@/lib/utils`), Recharts, Octokit (`octokit` package: GitHub App,
`.graphql` for PRs/stats, `.rest` for releases), Vercel REST API, Neon Postgres + Drizzle ORM,
Auth.js v5 (owner-only GitHub sign-in), Vitest, Playwright, ESLint + Prettier.

## Folder layout

```
src/app/            routes (App Router). API routes under src/app/api/
src/components/ui/  shadcn/ui primitives (add with `pnpm dlx shadcn@latest add <name>`)
src/components/     app components
src/lib/github/     GitHub App + Octokit helpers. Keep queries/mappers pure (unit-testable);
                    I/O lives in files that import "server-only"
src/lib/vercel/     Vercel REST client
src/lib/share/      share-link tokens (hash-only storage, constant-time verify)
src/lib/env.ts      requireEnv(): read env vars at call time, never at import time
src/db/             Drizzle schema (schema.ts) and client (getDb())
src/auth.ts         Auth.js config
tests/unit/         Vitest (*.test.ts)
tests/e2e/          Playwright (*.spec.ts)
scripts/            repo tooling (sync-repo.sh)
docs/               SPEC.md and images
```

## Checks

Run lint, typecheck and tests before every commit:

```bash
pnpm lint && pnpm typecheck && pnpm test
pnpm build && pnpm test:e2e   # before opening a PR, or when touching pages or routes
```

- E2E needs `pnpm e2e:db` (Docker Postgres on :54329). Playwright starts the app on :3100
  plus a mock GitHub API on :4010 (`tests/e2e/support/mock-github.mts`); extend the mock when
  adding GitHub calls. Sign in with the `signInAs()` fixture from `tests/e2e/support/fixtures.ts`.
- Run `pnpm format` before committing.
- CI (`.github/workflows/ci.yml`) runs the same checks. `main` requires them to pass.

## Conventions

- Never commit secrets. New env vars go in `.env.example` with a comment, and in the README table.
- Build and tests must pass without any env vars. Create clients lazily (`getDb()`,
  `getGitHubApp()`) and don't read env at module top level.
- Share links: store only `hashShareToken(token)`. Revoked and unknown tokens both return 404.
- Owner-only pages and server actions call `requireOwner()` (`src/lib/owner.ts`) first.
- Server components by default. Add `"use client"` only where interactivity requires it.
- Small commits with clear, conventional messages (`feat:`, `fix:`, `chore:`, `docs:`, `ci:`).
- Work on a branch and open a PR with `gh pr create`. Never push directly to `main`.
  PRs are squash-merged using the PR title, so write PR titles as commit messages.

## Repo settings

`repo.config.json` holds the GitHub description, homepage and topics. `pnpm sync-repo`
(`scripts/sync-repo.sh`) applies those plus the merge settings and branch protection.
It is safe to re-run.

**Rule:** whenever `docs/SPEC.md` changes in a way that affects the repo description or
topics, update `repo.config.json` and run `pnpm sync-repo` in the same PR.
