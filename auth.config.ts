import type { NextAuthConfig } from "next-auth";

const protectedPrefixes = ["/planograms", "/skus", "/settings", "/invite"];

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Edge-safe Auth.js config (middleware). JWT password-revocation checks that
 * need Prisma live in `auth.ts` so they do not run on the Edge runtime.
 */
export default {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      if (!isProtectedPath(nextUrl.pathname)) {
        return true;
      }
      return !!auth?.user;
    },
    jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
