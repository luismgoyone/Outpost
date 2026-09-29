/**
 * A tiny stand-in for the GitHub API, used by e2e tests via GITHUB_API_URL.
 * Serves one installation (acme) with a few repos and canned pull requests. Each e2e test
 * owns its repos (tests run in parallel against one database):
 *   storefront → connect-repo flow · docs → empty state and visitor leak · api, legacy → PR screen
 *   mobile → My Work (review request, my PR with changes requested, stale PR, failing main)
 *   billing → Overview (language, release, PR history for sparklines, a failing PR, prod deploy)
 *   marketing → Deployments (production, preview building, staging failed, superseded preview)
 *   platform → Releases (latest + previous + old release, a draft, notes with unsafe HTML/links)
 *              and repo detail (workflow runs, one deployment); docs → Actions permission denied
 * "legacy" always fails its GraphQL query, to exercise per-repo error handling.
 * Run directly with Node (type stripping): node tests/e2e/support/mock-github.mts
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

const port = Number(process.env.MOCK_GITHUB_PORT ?? 4010);
const INSTALLATION_ID = 4242;
const owner = { login: "acme" };

const HOUR = 3600_000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

const repositories = [
  { id: 1, name: "storefront", full_name: "acme/storefront", owner, private: true },
  { id: 2, name: "docs", full_name: "acme/docs", owner, private: false },
  { id: 3, name: "api", full_name: "acme/api", owner, private: true },
  { id: 4, name: "legacy", full_name: "acme/legacy", owner, private: false },
  { id: 5, name: "mobile", full_name: "acme/mobile", owner, private: true },
  { id: 6, name: "billing", full_name: "acme/billing", owner, private: true },
  { id: 7, name: "marketing", full_name: "acme/marketing", owner, private: false },
  { id: 8, name: "platform", full_name: "acme/platform", owner, private: true },
];

function release(tagName: string, daysAgo: number, extra: object = {}) {
  return {
    id: `R_${tagName}`,
    name: null,
    tagName,
    url: `https://github.com/acme/platform/releases/tag/${tagName}`,
    publishedAt: ago(daysAgo * 24 * HOUR),
    createdAt: ago(daysAgo * 24 * HOUR),
    isLatest: false,
    isPrerelease: false,
    isDraft: false,
    description: null,
    author: { login: "sarah-chen" },
    ...extra,
  };
}

const releases: Record<string, unknown[]> = {
  platform: [
    release("v2.9.0-draft", 0, { isDraft: true }),
    release("v2.8.1", 3, {
      isLatest: true,
      description: [
        "## What's changed",
        "- **feat(auth):** add fine-grained API scope validation (#284)",
        "- perf(worker): Redis cluster sharding (#281)",
        "<script>window.__pwned = true</script>",
        "[click me](javascript:window.__pwned=true)",
      ].join("\n"),
    }),
    release("v2.8.0", 20, { author: { login: "alex-k" } }),
    release("v2.7.0", 130),
  ],
};

/** GET /repos/acme/:repo/actions/runs */
function workflowRuns(repo: string) {
  if (repo !== "platform") return { total_count: 0, workflow_runs: [] };
  const run = (
    id: number,
    workflowId: number,
    conclusion: string | null,
    hoursAgo: number,
    durSec: number,
  ) => {
    const started = Date.now() - hoursAgo * HOUR;
    return {
      id,
      workflow_id: workflowId,
      name: workflowId === 1 ? "CI / Test & Lint" : "Deploy to Production",
      path: workflowId === 1 ? ".github/workflows/ci.yml" : ".github/workflows/deploy.yml",
      event: workflowId === 1 ? "push" : "workflow_dispatch",
      head_branch: "main",
      status: conclusion === null ? "in_progress" : "completed",
      conclusion,
      run_started_at: new Date(started).toISOString(),
      created_at: new Date(started).toISOString(),
      updated_at: new Date(started + durSec * 1000).toISOString(),
      html_url: `https://github.com/acme/platform/actions/runs/${id}`,
    };
  };
  const ci = Array.from({ length: 12 }, (_, i) =>
    run(1000 + i, 1, i === 3 ? "failure" : "success", 30 - i * 2, 134),
  );
  return {
    total_count: 14,
    workflow_runs: [...ci, run(2000, 2, "success", 72, 370), run(2001, 2, "success", 5, 370)],
  };
}

/** GET /repos/acme/:repo/compare/:base...:head */
function compare(repo: string, basehead: string) {
  const commit = (login: string, message: string) => ({ author: { login }, commit: { message } });
  const commits =
    basehead === "v2.8.0...v2.8.1"
      ? [
          commit("sarah-chen", "feat(auth): add fine-grained API scope validation (#284)"),
          commit("alex-k", "perf(worker): Redis cluster sharding (#281)"),
          commit("marcus-b", "fix(db): pool leak during failover (#279)"),
          commit("sarah-chen", "chore(deps): upgrade Go runtime (#275)"),
          ...Array.from({ length: 14 }, (_, i) => commit("alex-k", `wip ${i}`)),
        ]
      : [commit("alex-k", "release prep (#200)")];
  return {
    total_commits: commits.length,
    commits,
    html_url: `https://github.com/acme/${repo}/compare/${basehead}`,
  };
}

function deployment(
  id: string,
  environment: string,
  state: string,
  createdMinutesAgo: number,
  extra: { durationSec?: number; message?: string; ref?: string | null; url?: string } = {},
) {
  const createdAt = ago(createdMinutesAgo * 60_000);
  return {
    id,
    environment,
    createdAt,
    ref: extra.ref === null ? null : { name: extra.ref ?? "main" },
    commitOid: `${id}9fd031aa`,
    commit: { messageHeadline: extra.message ?? `deploy ${id}` },
    creator: { login: "vercel" },
    latestStatus: {
      state,
      createdAt: new Date(
        new Date(createdAt).getTime() + (extra.durationSec ?? 30) * 1000,
      ).toISOString(),
      environmentUrl: extra.url ?? `https://${id}.example.app`,
      logUrl: `https://vercel.example/logs/${id}`,
    },
  };
}

const deployments: Record<string, unknown[]> = {
  marketing: [
    deployment("mk1", "Production", "SUCCESS", 60, {
      durationSec: 84,
      message: "feat(pricing): update enterprise tier add-on calculators",
    }),
    deployment("mk2", "Preview", "IN_PROGRESS", 10, {
      ref: "feat/stripe",
      message: "feat(stripe): webhook retry",
    }),
    deployment("mk3", "staging", "FAILURE", 120, {
      message: "fix(taxjar): handle zero-rate timeouts",
    }),
    deployment("mk4", "Preview", "INACTIVE", 300, { ref: "old/branch", message: "old preview" }),
  ],
  billing: [deployment("bl1", "Production", "SUCCESS", 42, { durationSec: 70 })],
  platform: [deployment("pl1", "Production", "SUCCESS", 180, { message: "release v2.8.1" })],
};

const DAY = 24 * 3600_000;

/** Repo-level fields: visibility, language, latest release and recent PR history. */
function repoMeta(name: string) {
  const isBilling = name === "billing";
  return {
    isPrivate: repositories.find((r) => r.name === name)?.private ?? false,
    primaryLanguage: isBilling
      ? { name: "Go", color: "#00ADD8" }
      : { name: "TypeScript", color: "#3178c6" },
    latestRelease: isBilling
      ? {
          tagName: "v1.19.0",
          url: "https://github.com/acme/billing/releases/tag/v1.19.0",
          publishedAt: ago(2 * DAY),
        }
      : name === "platform"
        ? {
            tagName: "v2.8.1",
            url: "https://github.com/acme/platform/releases/tag/v2.8.1",
            publishedAt: ago(3 * DAY),
          }
        : null,
    // billing: 3 PRs/week for 8 weeks; 4 closed in the last 30 days, 3 of them merged (75%).
    recent: {
      nodes: isBilling
        ? Array.from({ length: 24 }, (_, i) => {
            const created = ago(i * 2.4 * DAY + 3600_000);
            const closed = i >= 1 && i <= 4 ? ago(i * DAY) : null;
            return {
              createdAt: created,
              closedAt: closed,
              mergedAt: closed && i !== 4 ? closed : null,
            };
          })
        : [],
    },
  };
}

/** Repos whose default branch CI is failing. */
const failingMain = new Set(["mobile"]);

function defaultBranchRef(name: string) {
  return {
    name: "main",
    target: {
      oid: `${name}0000c84a1e9f`,
      messageHeadline: failingMain.has(name) ? "Build fastlane iOS test suite" : "chore: bump deps",
      committedDate: ago(3 * HOUR),
      url: `https://github.com/acme/${name}/commit/${name}0000c84a1e9f`,
      statusCheckRollup: { state: failingMain.has(name) ? "FAILURE" : "SUCCESS" },
    },
  };
}

function pr(number: number, title: string, state: string | null, extra: object = {}) {
  return {
    number,
    title,
    url: `https://github.com/acme/storefront/pull/${number}`,
    isDraft: false,
    createdAt: ago(48 * HOUR),
    updatedAt: ago(24 * HOUR),
    mergedAt: null,
    author: { login: "dev-sam", avatarUrl: "https://avatars.example/dev-sam" },
    headRefName: `feat/pr-${number}`,
    additions: 10,
    deletions: 2,
    reviewDecision: "REVIEW_REQUIRED",
    latestOpinionatedReviews: { nodes: [] },
    reviewRequests: { nodes: [] },
    commits: { nodes: [{ commit: { statusCheckRollup: state ? { state } : null } }] },
    ...extra,
  };
}

const requested = (...logins: string[]) => ({
  nodes: logins.map((login) => ({ requestedReviewer: { login } })),
});
const approvedBy = (n: number) => ({
  nodes: Array.from({ length: n }, () => ({ state: "APPROVED" })),
});
const author = (login: string) => ({ login, avatarUrl: `https://avatars.example/${login}` });

const pullRequests: Record<string, { open: unknown[]; merged: unknown[] }> = {
  storefront: {
    open: [
      pr(15, "Checkout redesign", "SUCCESS"),
      pr(16, "Wishlist page", "PENDING", { isDraft: true }),
      pr(17, "Upgrade payments SDK", "FAILURE"),
    ],
    merged: [pr(12, "Fix cart totals rounding", "SUCCESS", { mergedAt: "2026-09-27T09:00:00Z" })],
  },
  docs: { open: [], merged: [] },
  api: {
    open: [
      pr(289, "Migrate notifications stream", "SUCCESS", {
        author: author("e2e-owner"),
        reviewDecision: "APPROVED",
        latestOpinionatedReviews: approvedBy(2),
        createdAt: ago(30 * HOUR),
        updatedAt: ago(20 * HOUR),
      }),
      pr(254, "Deprecate legacy v1 auth endpoints", "SUCCESS", {
        author: author("marcus-b"),
        createdAt: ago(20 * 24 * HOUR),
        updatedAt: ago(18 * 24 * HOUR),
      }),
      pr(301, "Add request rate limiter", "FAILURE", {
        author: author("sarah-chen"),
        reviewDecision: "CHANGES_REQUESTED",
        createdAt: ago(5 * HOUR),
        updatedAt: ago(2 * HOUR),
      }),
      pr(305, "Spike: gRPC transport", "PENDING", {
        author: author("sarah-chen"),
        isDraft: true,
        createdAt: ago(3 * HOUR),
        updatedAt: ago(1 * HOUR),
      }),
    ],
    merged: [],
  },
  marketing: { open: [], merged: [] },
  platform: { open: [], merged: [] },
  billing: {
    open: [
      pr(88, "Support multi-currency invoicing", "FAILURE", { author: author("dev-sam") }),
      pr(89, "Retry webhook deliveries", "SUCCESS", { author: author("sarah-chen") }),
    ],
    merged: [],
  },
  mobile: {
    open: [
      pr(40, "Offline sync queue", "SUCCESS", {
        author: author("dev-sam"),
        reviewRequests: requested("e2e-owner"),
        updatedAt: ago(4 * HOUR),
      }),
      pr(41, "Fix tray menu crash", "SUCCESS", {
        author: author("e2e-owner"),
        reviewDecision: "CHANGES_REQUESTED",
        updatedAt: ago(6 * HOUR),
      }),
      pr(42, "Upgrade React Native to 0.74", "FAILURE", {
        author: author("david-l"),
        createdAt: ago(15 * 24 * HOUR),
        updatedAt: ago(12 * 24 * HOUR),
      }),
    ],
    merged: [],
  },
};

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${port}`);
  const route = `${req.method} ${url.pathname}`;

  if (route === "GET /health") return send(res, 200, { ok: true });
  if (route === "GET /app")
    return send(res, 200, { id: 1, slug: "outpost-e2e", name: "Outpost E2E" });
  if (route === "GET /app/installations") {
    return send(res, 200, [{ id: INSTALLATION_ID, account: owner }]);
  }
  if (route === `POST /app/installations/${INSTALLATION_ID}/access_tokens`) {
    return send(res, 201, {
      token: "ghs_mock_installation_token",
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
      permissions: { pull_requests: "read" },
      repository_selection: "selected",
    });
  }
  if (route === "GET /installation/repositories") {
    return send(res, 200, { total_count: repositories.length, repositories });
  }
  const runsMatch = url.pathname.match(/^\/repos\/acme\/([^/]+)\/actions\/runs$/);
  if (req.method === "GET" && runsMatch) {
    if (runsMatch[1] === "docs") {
      return send(res, 403, { message: "Resource not accessible by integration" });
    }
    return send(res, 200, workflowRuns(runsMatch[1]));
  }
  const compareMatch = url.pathname.match(/^\/repos\/acme\/([^/]+)\/compare\/(.+)$/);
  if (req.method === "GET" && compareMatch) {
    return send(res, 200, compare(compareMatch[1], decodeURIComponent(compareMatch[2])));
  }
  if (route === "POST /graphql") {
    const { query, variables } = (await readJson(req)) as {
      query?: string;
      variables?: { name?: string };
    };
    if (variables?.name === "legacy") {
      return send(res, 200, {
        data: { repository: null },
        errors: [{ type: "FORBIDDEN", message: "Resource not accessible by integration" }],
      });
    }
    if (query?.includes("RepoReleases")) {
      const nodes = releases[variables?.name ?? ""] ?? [];
      return send(res, 200, { data: { repository: { releases: { nodes } } } });
    }
    if (query?.includes("RepoDeployments")) {
      const nodes = deployments[variables?.name ?? ""] ?? [];
      return send(res, 200, { data: { repository: { deployments: { nodes } } } });
    }
    const data = pullRequests[variables?.name ?? ""];
    return send(res, 200, {
      data: {
        repository: data
          ? {
              ...repoMeta(variables?.name ?? ""),
              defaultBranchRef: defaultBranchRef(variables?.name ?? ""),
              open: { nodes: data.open },
              merged: { nodes: data.merged },
            }
          : null,
      },
    });
  }

  send(res, 404, { message: `mock-github: no handler for ${route}` });
});

server.listen(port, () => console.log(`mock-github listening on :${port}`));
