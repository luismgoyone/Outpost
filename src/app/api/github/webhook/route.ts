import { revalidatePath } from "next/cache";

import { invalidate } from "@/lib/cache";
import { CACHE_INVALIDATING_EVENTS, verifyWebhookSignature } from "@/lib/github/webhook-signature";
import { findConnectedRepo } from "@/lib/repos";

/**
 * GitHub App webhook: when something changes in a connected repo, drop its cached data so
 * the next page view shows it. Requests must be signed with GITHUB_WEBHOOK_SECRET.
 */
export async function POST(request: Request) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "Webhooks are not configured" }, { status: 503 });

  const body = await request.text();
  if (!verifyWebhookSignature(secret, body, request.headers.get("x-hub-signature-256"))) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = request.headers.get("x-github-event") ?? "";
  if (event === "ping") return Response.json({ ok: true });
  if (!CACHE_INVALIDATING_EVENTS.has(event))
    return Response.json({ ignored: event }, { status: 202 });

  let payload: { repository?: { name?: string; owner?: { login?: string } } };
  try {
    payload = JSON.parse(body);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const owner = payload.repository?.owner?.login;
  const name = payload.repository?.name;
  const repo = owner && name ? await findConnectedRepo(owner, name) : undefined;
  if (!repo) return Response.json({ ignored: "repository not connected" }, { status: 202 });

  await invalidate([repo.id]);
  revalidatePath("/", "layout");
  return Response.json({ invalidated: `${repo.owner}/${repo.name}` }, { status: 202 });
}
