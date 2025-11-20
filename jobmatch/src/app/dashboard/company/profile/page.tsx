import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import CompanyProfileForm from "@/app/onboarding/company/company-form";
import Header from "@/components/ui/Header_with_Icons";

export default async function CompanyProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[--brand] px-4 py-10 text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-wrap items-center gap-4">
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
