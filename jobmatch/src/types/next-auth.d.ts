import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      accountType?: "COMPANY" | "STUDENT";
      isAdmin?: boolean;
      status?: "ACTIVE" | "DEACTIVATED" | "BANNED";
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    accountType?: "COMPANY" | "STUDENT" | null;
    isAdmin?: boolean;
    status?: "ACTIVE" | "DEACTIVATED" | "BANNED";
  }
}
