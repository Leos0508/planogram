import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import authConfig from "@/auth.config";
import { shouldCheckPasswordChangedAt } from "@/lib/auth/pwd-check";
import { prisma } from "@/lib/prisma";

async function passwordChangedAtMs(userId: string): Promise<number | null> {
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordChangedAt: true },
    });
    if (!dbUser) {
      return null;
    }
    return dbUser.passwordChangedAt?.getTime() ?? 0;
  } catch (error) {
    // Never let a DB blip surface as JWTSessionError (clears the cookie).
    console.error("[auth.jwt] passwordChangedAt lookup failed", error);
    return 0;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
        // Stamp from DB (not `user.*`) — Auth.js strips custom Credentials fields.
        const changedAt = await passwordChangedAtMs(user.id);
        token.pwdChangedAt = changedAt ?? 0;
        token.pwdCheckedAt = Date.now();
        return token;
      }

      if (!token.sub) {
        return token;
      }

      const decision = shouldCheckPasswordChangedAt({
        nowMs: Date.now(),
        pwdCheckedAt:
          typeof token.pwdCheckedAt === "number" ? token.pwdCheckedAt : undefined,
      });
      if (decision.action === "skip") {
        return token;
      }

      const changedAt = await passwordChangedAtMs(token.sub);
      if (changedAt === null) {
        // User deleted — end session without throwing.
        return null;
      }

      const tokenChangedAt =
        typeof token.pwdChangedAt === "number" ? token.pwdChangedAt : 0;

      // Password changed after this JWT was minted → force re-auth.
      if (changedAt > tokenChangedAt) {
        return null;
      }

      token.pwdCheckedAt = Date.now();
      return token;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
          },
        });

        if (!user?.passwordHash) {
          return null;
        }

        const valid = await compare(password, user.passwordHash);
        if (!valid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
});
