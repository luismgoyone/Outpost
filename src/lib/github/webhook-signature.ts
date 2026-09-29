import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verify GitHub's `X-Hub-Signature-256` header (HMAC-SHA256 of the raw body with the
 * webhook secret), in constant time.
 */
export function verifyWebhookSignature(
  secret: string,
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  if (!secret || !signatureHeader?.startsWith("sha256=")) return false;
  const expected = Buffer.from(
    `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`,
  );
  const received = Buffer.from(signatureHeader);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function signWebhookBody(secret: string, rawBody: string): string {
  return `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
}

/** Events that change what Outpost shows for a repo. */
export const CACHE_INVALIDATING_EVENTS = new Set([
  "pull_request",
  "pull_request_review",
  "check_suite",
  "check_run",
  "status",
  "workflow_run",
  "release",
  "deployment",
  "deployment_status",
  "push",
]);
