import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

/** Owner-only auth. Clients never sign in; they use share links. */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  callbacks: {
    signIn({ profile }) {
      const owner = process.env.OWNER_GITHUB_LOGIN;
      return !!owner && profile?.login === owner;
    },
  },
});
