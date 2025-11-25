import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import LinkedInImportClient from "./LinkedInImportClient";
import Header from "@/components/ui/Header";

export default async function LinkedInImportPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[--background] px-4 py-10 text-[--foreground]">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-3xl border border-[--border] bg-[--surface] p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-[--brand]">Review LinkedIn data</h1>
          <p className="mt-2 text-sm opacity-80">
            Choose which experiences and certifications to add to your profile. You can safely re-import
            later—existing items will update rather than duplicate.
          </p>
        </div>

        <LinkedInImportClient />
      </div>
      </main>
    </>
  );
}

