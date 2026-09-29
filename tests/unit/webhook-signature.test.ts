import { describe, expect, it } from "vitest";

import { signWebhookBody, verifyWebhookSignature } from "@/lib/github/webhook-signature";

describe("webhook signatures", () => {
  const secret = "It's a Secret to Everybody";
  const body = "Hello, World!";

  it("matches GitHub's documented test vector", () => {
    // From GitHub's "Validating webhook deliveries" docs.
    expect(signWebhookBody(secret, body)).toBe(
      "sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17",
    );
  });

  it("accepts a valid signature and rejects anything else", () => {
    const sig = signWebhookBody(secret, body);
    expect(verifyWebhookSignature(secret, body, sig)).toBe(true);
    expect(verifyWebhookSignature(secret, body + " ", sig)).toBe(false);
    expect(verifyWebhookSignature("other", body, sig)).toBe(false);
    expect(verifyWebhookSignature(secret, body, null)).toBe(false);
    expect(verifyWebhookSignature(secret, body, "sha1=abc")).toBe(false);
    expect(verifyWebhookSignature(secret, body, "sha256=short")).toBe(false);
    expect(verifyWebhookSignature("", body, sig)).toBe(false);
  });
});
