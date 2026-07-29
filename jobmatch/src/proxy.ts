import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(function proxy(req) {
  // Users given a temp password by an admin are confined to the
  // change-password page until they set their own. The flag clears (and a
  // fresh token is issued) when they log back in after changing it.
  if (req.nextauth.token?.mustChangePassword) {
    return NextResponse.redirect(new URL("/change-password", req.url));
  }
}, {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized: ({ token, req }) => {
      if (!token) return false;
      if (req.nextUrl.pathname.startsWith("/admin")) {
        return token.isAdmin === true && token.status === "ACTIVE";
      }
      return true;
    },
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/notifications/:path*",
    "/companies/:path*",
    "/admin/:path*",
  ],
};
