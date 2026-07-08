import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AdminHeader from "./_components/AdminHeader";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin || session.user.status !== "ACTIVE") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminHeader />
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
