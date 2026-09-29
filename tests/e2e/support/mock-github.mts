/**
 * A tiny stand-in for the GitHub API, used by e2e tests via GITHUB_API_URL.
 * Serves one installation (acme) with two repos and canned pull requests.
 * Run directly with Node (type stripping): node tests/e2e/support/mock-github.mts
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

const port = Number(process.env.MOCK_GITHUB_PORT ?? 4010);
const INSTALLATION_ID = 4242;
const owner = { login: "acme" };

const repositories = [
  { id: 1, name: "storefront", full_name: "acme/storefront", owner, private: true },
  { id: 2, name: "docs", full_name: "acme/docs", owner, private: false },
];

function pr(number: number, title: string, state: string | null, extra: object = {}) {
  return {
    number,
    title,
    url: `https://github.com/acme/storefront/pull/${number}`,
    isDraft: false,
    createdAt: "2026-09-20T10:00:00Z",
    updatedAt: "2026-09-28T10:00:00Z",
    mergedAt: null,
    author: { login: "dev-sam", avatarUrl: "https://avatars.example/dev-sam" },
    commits: { nodes: [{ commit: { statusCheckRollup: state ? { state } : null } }] },
    ...extra,
  };
}

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
    const data = pullRequests[variables?.name ?? ""];
    return send(res, 200, {
      data: {
        repository: data ? { open: { nodes: data.open }, merged: { nodes: data.merged } } : null,
      },
    });
  }

  send(res, 404, { message: `mock-github: no handler for ${route}` });
});

server.listen(port, () => console.log(`mock-github listening on :${port}`));
