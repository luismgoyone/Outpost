# Outpost: product spec

## What Outpost is

Outpost is a **personal engineering control center** for the developer who owns it. It
connects to all of your GitHub repositories through a GitHub App and shows, in one dense,
fast, dark dashboard:

- **What needs you**: PRs waiting on your review, your own PRs and their state, stale PRs,
  failing CI and failed deployments
- **Pull requests** across every connected repo, with CI status, review state and age
- **Deployments** and preview links (Vercel, and GitHub deployments)
- **Releases** and changelogs across repos
- **Repo health**: open PRs, main-branch CI, last production deploy, latest release and
  PRs per week for each repo

Outpost is for one person: the owner. It is not a team tool and not client-facing.

> **Later:** a client-facing, read-only share link for a single repo (issue #3). It stays out
> of scope until the owner experience is done.

## Design

The UI follows the **Engineered Precision** design system (Google Stitch project
"Outpost Multi-Repository Control Center"):

- Dark only. Slate surfaces (`#0B0F17` canvas, `#111620` panels, `#161B26` cards), 1px
  `rgba(255,255,255,0.08)` borders, no heavy shadows
- One accent, `#0EA5E9`, reserved for primary actions and the active navigation item
- Status colors carry meaning and nothing else: passing `#10B981`, pending `#F59E0B`,
  failing `#EF4444`, draft/queued `#64748B`. Status is always a dot plus a label, never
  color alone
- Geist for interface text; JetBrains Mono for machine data (SHAs, branches, versions,
  PR numbers, durations, timestamps)
- High density: 36px table rows, 4px radius on controls, 8px on cards, 24px max title
- App shell: 240px sidebar (My Work, Overview, Pull Requests, Deployments, Releases,
  Repositories, Settings), 44px header with breadcrumbs and a ⌘K search trigger

## Screens

| Screen        | Purpose                                                                                |
| ------------- | -------------------------------------------------------------------------------------- |
| My Work       | Personal inbox: waiting on my review, my PRs, stale PRs in my repos, failed runs       |
| Overview      | Attention cards (stale, failing CI, waiting for review, failed deploys) and repo cards |
| Pull Requests | Every open PR across repos, with filters (repo, mine, needs review, stale, failing CI) |
| Deployments   | Deployment activity across environments, filterable by repo, environment and status    |
| Releases      | Release timeline with changelogs across repos                                          |
| Repositories  | Connected repos; repo detail with PRs, workflow runs, deployments and releases tabs    |
| Settings      | Connected accounts (GitHub App, Vercel) and, later, alert rules                        |

## Users and access

- **Owner**: signs in with GitHub (Auth.js). Only `OWNER_GITHUB_LOGIN` can sign in.
- Outpost reads from GitHub through the GitHub App (read-only permissions) and from Vercel
  with a token. It never writes to your repos in the MVP.

## Tech stack

- Next.js (App Router) + TypeScript (strict), pnpm
- Tailwind CSS + shadcn/ui, Recharts for charts
- GitHub App for repo access; Octokit with GraphQL for PRs/stats and REST for releases,
  workflow runs and deployments
- Deployments from the GitHub Deployments API (Vercel, Netlify and CI report there); the
  Vercel REST API is reserved for Vercel-only details later
- Postgres (Neon) + Drizzle ORM for connected repos and cached data
- Auth.js with GitHub provider, owner only
- Vitest for unit tests, Playwright for end-to-end tests (video on failure)
- ESLint + Prettier
- Deploy target: Vercel

## MVP milestones

1. ✅ **Connect repos** via the GitHub App and list PRs with CI status (#2)
2. **App shell and design system**: Engineered Precision theme, sidebar and header,
   restyle existing pages (#11)
3. **Pull Requests**: cross-repo PR table with review state, age and filters (#12)
4. **My Work**: personal inbox across repos (#13)
5. **Overview**: attention cards and repo health cards, including PRs-per-week sparklines (#6)
6. **Deployments**: GitHub Deployments (incl. Vercel) across repos (#4)
7. **Releases**: release timeline and changelogs across repos (#5)
8. **Repository detail**: tabs for PRs, workflow runs, deployments and releases (#14)
9. **Cache and live updates**: 5-minute Postgres cache, Sync button, sidebar badges, and
   signed GitHub webhooks that refresh a repo's data (#7)

## Later

- Actions from Outpost: re-run CI, retry deploys, nudge reviewers (needs write permissions) (#15)
- Alerts and integrations: Slack digests and alert rules, Linear ticket links (#16)
- ⌘K command palette (#16)
- Client-facing read-only share link (#3)

Each milestone is tracked as a GitHub issue.
