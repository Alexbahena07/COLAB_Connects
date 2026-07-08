import { withAuth } from "next-auth/middleware";

export default withAuth(function middleware() {}, {
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
