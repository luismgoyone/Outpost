/**
 * A tiny stand-in for the GitHub API, used by e2e tests via GITHUB_API_URL.
 * Serves one installation (acme) with a few repos and canned pull requests. Each e2e test
 * owns its repos (tests run in parallel against one database):
 *   storefront → connect-repo flow · docs → empty state and visitor leak · api, legacy → PR screen
 *   mobile → My Work (review request, my PR with changes requested, stale PR, failing main)
 * "legacy" always fails its GraphQL query, to exercise per-repo error handling.
 * Run directly with Node (type stripping): node tests/e2e/support/mock-github.mts
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

const port = Number(process.env.MOCK_GITHUB_PORT ?? 4010);
const INSTALLATION_ID = 4242;
const owner = { login: "acme" };

const repositories = [
  { id: 1, name: "storefront", full_name: "acme/storefront", owner, private: true },
  { id: 2, name: "docs", full_name: "acme/docs", owner, private: false },
  { id: 3, name: "api", full_name: "acme/api", owner, private: true },
  { id: 4, name: "legacy", full_name: "acme/legacy", owner, private: false },
  { id: 5, name: "mobile", full_name: "acme/mobile", owner, private: true },
];

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

const HOUR = 3600_000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

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
  if (route === "POST /graphql") {
    const { variables } = (await readJson(req)) as { variables?: { name?: string } };
    if (variables?.name === "legacy") {
      return send(res, 200, {
        data: { repository: null },
        errors: [{ type: "FORBIDDEN", message: "Resource not accessible by integration" }],
      });
    }
    const data = pullRequests[variables?.name ?? ""];
    return send(res, 200, {
      data: {
        repository: data
          ? {
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
