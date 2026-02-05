import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      linkedinConnected?: boolean;
      accountType?: "COMPANY" | "STUDENT";
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    linkedinAccessToken?: string;
    linkedinRefreshToken?: string;
    linkedinAccessTokenExpires?: number;
  }
}
