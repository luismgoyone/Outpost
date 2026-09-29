import NextAuth, { type DefaultSession } from "next-auth";
import GitHub from "next-auth/providers/github";

declare module "next-auth" {
  interface Session {
    user: { login?: string } & DefaultSession["user"];
  }
}

/** Owner-only auth. Clients never sign in; they use share links. */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  callbacks: {
    signIn({ profile }) {
      return isOwner(profile?.login);
    },
    jwt({ token, profile }) {
      if (typeof profile?.login === "string") token.login = profile.login;
      return token;
    },
    session({ session, token }) {
      if (typeof token.login === "string") session.user.login = token.login;
      return session;
    },
  },
});

export function isOwner(login: unknown): boolean {
  const owner = process.env.OWNER_GITHUB_LOGIN;
  return !!owner && typeof login === "string" && login.toLowerCase() === owner.toLowerCase();
}
