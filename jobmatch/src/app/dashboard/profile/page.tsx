import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import ProfileForm from "@/app/onboarding/profile/profile-form";

export default async function StudentProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <main className="min-h-screen bg-[--brand] px-4 py-10 text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Your profile</h1>
            <p className="text-sm opacity-80">
              Keep your details current so companies know exactly what you bring to the table.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl border border-white px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Back to dashboard
          </Link>
        </div>

        <div className="card-wide">
          <ProfileForm redirectTo="/dashboard" />
        </div>
      </div>
    </main>
  );
}
