import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { isRateLimited } from "@/lib/rateLimit";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  debug: process.env.NODE_ENV !== "production",
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials, req) => {
        const email = credentials?.email ? credentials.email.toLowerCase().trim() : undefined;
        const password = credentials?.password;
        if (!email || !password) return null;

        const forwardedFor = req?.headers?.["x-forwarded-for"];
        const ip =
          (typeof forwardedFor === "string" ? forwardedFor.split(",")[0]?.trim() : null) ??
          "unknown";
        if (isRateLimited(`login:email:${email}`, 10) || isRateLimited(`login:ip:${ip}`, 30)) {
          throw new Error("RATE_LIMITED");
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) return null;

        const match = await bcrypt.compare(password, user.password);
        if (!match) return null;

        if (user.status !== "ACTIVE") return null;

        // Only surfaced after the password check passes, so it can't be used
        // to probe whether an email is registered.
        if (!user.emailVerified) throw new Error("EMAIL_NOT_VERIFIED");

        return {
          id: user.id,
          email: user.email ?? undefined,
          name: user.name ?? undefined,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      // Credentials sign-in already rejects non-ACTIVE users in authorize(); this
      // covers OAuth providers, which skip authorize() entirely.
      if (!user?.id) return true;
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { status: true },
      });
      return dbUser?.status === "ACTIVE";
    },
    async jwt({ token, user }) {
      // `user` is only populated on the first sign-in. Write accountType into the
      // token here so the session() callback never needs to hit the DB.
      if (user?.id) {
        token.id = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { accountType: true, isAdmin: true, status: true, mustChangePassword: true },
        });
        token.accountType = dbUser?.accountType ?? null;
        token.isAdmin = dbUser?.isAdmin ?? false;
        token.status = dbUser?.status ?? "ACTIVE";
        token.mustChangePassword = dbUser?.mustChangePassword ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: (token.id as string | undefined) ?? session.user?.id ?? "",
          accountType: token.accountType,
          isAdmin: Boolean(token.isAdmin),
          status: (token.status as string | undefined) ?? "ACTIVE",
          mustChangePassword: Boolean(token.mustChangePassword),
        },
      };
    },
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
};
