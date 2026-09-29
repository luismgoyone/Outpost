import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** 32 random bytes → 43 base64url chars. Unguessable; safe in a URL path. */
const TOKEN_BYTES = 32;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** Create a new share token. Show it to the owner once; store only its hash. */
export function generateShareToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

/** Cheap shape check to reject junk before touching the database. */
export function isWellFormedShareToken(token: string): boolean {
  return TOKEN_PATTERN.test(token);
}

/** SHA-256 hex digest of a token. This is what goes in the database. */
export function hashShareToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time check of a presented token against a stored hash. */
export function verifyShareToken(token: string, storedHash: string): boolean {
  if (!isWellFormedShareToken(token)) return false;
  const presented = Buffer.from(hashShareToken(token), "hex");
  const stored = Buffer.from(storedHash, "hex");
  return presented.length === stored.length && timingSafeEqual(presented, stored);
}
