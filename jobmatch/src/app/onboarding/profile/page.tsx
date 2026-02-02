// src/app/onboarding/profile/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProfileForm from "./profile-form";
import Header from "@/components/ui/Header";

export default async function ProfileOnboarding() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <>
      <Header />
      {/* No gradient here — keep it clean, consistent, and let the form cards do the work */}
      <main className="min-h-screen bg-background text-foreground px-4 py-10">
        <div className="mx-auto w-full max-w-6xl">
          
          

          {/* Form renders its own sections/cards — keep page wrapper neutral */}
          <ProfileForm />
        </div>
      </main>
    </>
  );
}
