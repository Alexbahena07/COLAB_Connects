export const runtime = "nodejs";

import NextAuth, { type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import LinkedIn from "next-auth/providers/linkedin";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

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
    signIn: "/login", // reuse your login page
  },
  callbacks: {
    async jwt({ token, user, account }) {
      const userId = typeof user?.id === "string" ? user.id : undefined;
      if (userId) {
        token.id = userId;
      }
      if (account?.provider === "linkedin") {
        if (account.access_token) {
          token.linkedinAccessToken = account.access_token;
        }
        if (account.refresh_token) {
          token.linkedinRefreshToken = account.refresh_token;
        }
        if (account.expires_at) {
          token.linkedinAccessTokenExpires = account.expires_at * 1000;
        }
      }
      return token;
    },
    async session({ session, token }) {
      try {
        const userId = token?.id as string | undefined;
        let dbUser:
          | { name: string | null; email: string | null; image: string | null }
          | null = null;

        if (userId) {
          dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, email: true, image: true },
          });
        }

        const linkedinConnected = Boolean(token?.linkedinAccessToken);
        return {
          ...session,
          user: {
            id: userId ?? session.user?.id ?? "",
            name: dbUser?.name ?? session.user?.name ?? undefined,
            email: dbUser?.email ?? session.user?.email ?? undefined,
            image: dbUser?.image ?? session.user?.image ?? undefined,
            linkedinConnected,
          },
        };
      } catch (error) {
        console.error("session callback error:", error);
        return {
          ...session,
          user: {
            id: session.user?.id ?? "",
            name: session.user?.name,
            email: session.user?.email,
            image: session.user?.image,
            linkedinConnected: session.user?.linkedinConnected,
          },
        };
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
