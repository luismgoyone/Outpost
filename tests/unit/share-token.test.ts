import { describe, expect, it } from "vitest";

import {
  generateShareToken,
  hashShareToken,
  isWellFormedShareToken,
  verifyShareToken,
} from "@/lib/share/token";

describe("share tokens", () => {
  it("generates URL-safe, well-formed, unique tokens", () => {
    const tokens = new Set(Array.from({ length: 100 }, generateShareToken));
    expect(tokens.size).toBe(100);
    for (const token of tokens) {
      expect(isWellFormedShareToken(token)).toBe(true);
      expect(encodeURIComponent(token)).toBe(token);
    }
  });

  it("hashes deterministically without exposing the token", () => {
    const token = generateShareToken();
    const hash = hashShareToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashShareToken(token)).toBe(hash);
    expect(hash).not.toContain(token);
  });

  it("verifies only the matching token", () => {
    const token = generateShareToken();
    const hash = hashShareToken(token);
    expect(verifyShareToken(token, hash)).toBe(true);
    expect(verifyShareToken(generateShareToken(), hash)).toBe(false);
  });

  it("rejects malformed input", () => {
    const hash = hashShareToken(generateShareToken());
    for (const bad of ["", "short", "a".repeat(44), "!".repeat(43), "../../etc/passwd"]) {
      expect(isWellFormedShareToken(bad)).toBe(false);
      expect(verifyShareToken(bad, hash)).toBe(false);
    }
  });

  it("rejects a malformed stored hash instead of throwing", () => {
    expect(verifyShareToken(generateShareToken(), "not-hex")).toBe(false);
  });
});
