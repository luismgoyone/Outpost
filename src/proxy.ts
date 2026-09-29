import { NextResponse } from "next/server";

import { auth, isOwner } from "@/auth";

/**
 * Owner pages are gated here, before anything renders or streams, so visitors get a real
 * redirect. Pages and server actions still call requireOwner() as a second layer.
 */
export const proxy = auth((request) => {
  const { nextUrl } = request;
  if (!request.auth?.user) {
    const signIn = new URL("/api/auth/signin", nextUrl.origin);
    signIn.searchParams.set("callbackUrl", `${nextUrl.pathname}${nextUrl.search}`);
    return NextResponse.redirect(signIn);
  }
  if (!isOwner(request.auth.user.login)) {
    return NextResponse.redirect(new URL("/?error=not-owner", nextUrl.origin));
  }
});

export const config = {
  matcher: [
    "/my-work/:path*",
    "/overview/:path*",
    "/pull-requests/:path*",
    "/deployments/:path*",
    "/releases/:path*",
    "/repositories/:path*",
    "/settings/:path*",
  ],
};
