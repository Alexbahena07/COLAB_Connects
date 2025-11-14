// src/app/onboarding/profile/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import ProfileForm from "./profile-form";
import Header from "@/components/ui/Header";

export default async function ProfileOnboarding() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <>
      <Header />
      <main className="min-h-screen grid place-items-center bg-[--brand] px-4">
        <div className="card-wide">
        <h1 className="text-2xl font-semibold mb-1">Set up your profile</h1>
        <p className="text-sm text-gray-600 mb-6">
          Add any info you like. Everything is optional—you can leave sections blank.
        </p>
        {/* Client form */}
        <ProfileForm />
        </div>
      </main>
    </>
  );
}
