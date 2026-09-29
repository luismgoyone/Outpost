import { test as base, expect, type Page } from "@playwright/test";
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

/**
 * Connect a mock repo, or open it if another test already connected it. Leaves the page on
 * the repo's detail page.
 */
export async function connectRepo(page: Page, fullName: string) {
  await page.goto("/repositories");
  const connect = page.getByRole("button", { name: `Connect ${fullName}` });
  const connected = page
    .getByRole("list", { name: "Connected repositories" })
    .getByRole("link", { name: fullName });
  await expect(connect.or(connected)).toBeVisible();
  if (await connect.isVisible()) await connect.click();
  else await connected.click();
  await expect(page).toHaveURL(/\/repositories\/[0-9a-f-]{36}$/);
}
