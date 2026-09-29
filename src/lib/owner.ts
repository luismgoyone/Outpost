import "server-only";

import { redirect } from "next/navigation";

import { auth, isOwner } from "@/auth";

/**
 * Gate for owner-only pages and server actions. Re-checks the login on every
 * request, so changing OWNER_GITHUB_LOGIN locks out old sessions immediately.
 */
export async function requireOwner(callbackUrl = "/repositories") {
  const session = await auth();
  if (!session?.user) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  if (!isOwner(session.user.login)) redirect("/?error=not-owner");
  return session;
}
