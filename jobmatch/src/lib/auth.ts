import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import LinkedIn from "next-auth/providers/linkedin";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

const linkedinClientId =
  process.env.LINKEDIN_CLIENT_ID ??
  process.env.AUTH_LINKEDIN_ID ??
  "";
const linkedinClientSecret =
  process.env.LINKEDIN_CLIENT_SECRET ??
  process.env.AUTH_LINKEDIN_SECRET ??
  "";

if (!linkedinClientId || !linkedinClientSecret) {
  console.warn(
    "[LinkedIn OAuth] Missing LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET (or AUTH_LINKEDIN_ID / AUTH_LINKEDIN_SECRET)."
  );
}

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
      authorize: async (credentials) => {
        const email = credentials?.email ? credentials.email.toLowerCase().trim() : undefined;
        const password = credentials?.password;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) return null;

        const match = await bcrypt.compare(password, user.password);
        if (!match) return null;

        return {
          id: user.id,
          email: user.email ?? undefined,
          name: user.name ?? undefined,
        };
      },
    }),
    LinkedIn({
      clientId: linkedinClientId,
      clientSecret: linkedinClientSecret,
      authorization: {
        params: {
          scope:
            process.env.LINKEDIN_SCOPES ??
            process.env.AUTH_LINKEDIN_SCOPES ??
            "openid profile email",
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // `user` is only populated on the first sign-in. Write accountType into the
      // token here so the session() callback never needs to hit the DB.
      if (user?.id) {
        token.id = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { accountType: true },
        });
        token.accountType = dbUser?.accountType ?? null;
      }
      if (account?.provider === "linkedin") {
        if (account.access_token) token.linkedinAccessToken = account.access_token;
        if (account.refresh_token) token.linkedinRefreshToken = account.refresh_token;
        if (account.expires_at) token.linkedinAccessTokenExpires = account.expires_at * 1000;
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
          linkedinConnected: Boolean(token.linkedinAccessToken),
        },
      };
    },
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
};
