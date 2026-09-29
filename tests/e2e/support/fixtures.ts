import { test as base, expect } from "@playwright/test";
import { encode } from "next-auth/jwt";

import { appUrl, E2E } from "./env";

const COOKIE = "authjs.session-token";

/** Mint a real Auth.js session cookie, the same one a GitHub sign-in would produce. */
async function sessionCookie(login: string) {
  const value = await encode({
    token: { name: login, login, sub: login },
    secret: E2E.authSecret,
    salt: COOKIE,
  });
  return { name: COOKIE, value, url: appUrl, httpOnly: true, sameSite: "Lax" as const };
}

export const test = base.extend<{ signInAs: (login?: string) => Promise<void> }>({
  signInAs: async ({ context }, use) => {
    await use(async (login = E2E.ownerLogin) => {
      await context.addCookies([await sessionCookie(login)]);
    });
  },
});

export { expect };
