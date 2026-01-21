import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import CompanyProfileForm from "@/app/onboarding/company/company-form";
import Header from "@/components/ui/Header_with_Icons";
import CompanyProfilePhotoEditor from "@/components/company/CompanyProfilePhotoEditor";

export default async function CompanyProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const profilePhoto = session.user?.image ?? null;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--brand)] px-4 py-10 text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-wrap items-center gap-6">
          <CompanyProfilePhotoEditor initialImage={profilePhoto} />
          <div>
            <h1 className="text-3xl font-semibold">Company profile</h1>
            <p className="text-sm opacity-80">
              Update the story students see when they discover and apply to your roles.
            </p>
          </div>
        </div>

        <div className="card-wide">
          <CompanyProfileForm />
        </div>
      </div>
      </main>
    </>
  );
}

