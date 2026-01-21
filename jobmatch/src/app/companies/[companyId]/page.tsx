import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import Header from "@/components/ui/Header_with_Icons";
import Footer from "@/components/ui/Footer";
import { prisma } from "@/lib/prisma";

type CompanyProfilePageProps = {
  params: Promise<{ companyId: string }>;
};

const labelValue = (label: string, value: ReactNode) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
    <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
      {label}
    </p>
    <p className="mt-1 text-sm font-semibold text-white">{value}</p>
  </div>
);

export default async function CompanyProfilePage({ params }: CompanyProfilePageProps) {
  const { companyId } = await params;

  const company = await prisma.user.findUnique({
    where: { id: companyId },
    select: {
      accountType: true,
      name: true,
      companyProfile: {
        select: {
          companyName: true,
          website: true,
          headquarters: true,
          teamSize: true,
          hiringFocus: true,
          about: true,
        },
      },
    },
  });

  if (!company || company.accountType !== "COMPANY") {
    notFound();
  }

  const profile = company.companyProfile;
  const companyName = profile?.companyName ?? company.name ?? "Company";
  const website = profile?.website ?? null;
  const headquarters = profile?.headquarters ?? null;
  const industry = profile?.hiringFocus ?? null;
  const bio = profile?.about ?? null;

  return (
    <>
      <Header />
      <main className="flex min-h-screen flex-col bg-[var(--background)] text-white">
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
                Company profile
              </p>
              <h1 className="mt-2 text-3xl font-semibold">{companyName}</h1>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-white/30 px-4 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Back to jobs
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {labelValue(
              "Website",
              website ? (
                <a
                  href={website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-white underline underline-offset-4"
                >
                  {website}
                </a>
              ) : (
                "Not provided"
              )
            )}
            {labelValue("Headquarters", headquarters || "Not provided")}
            {labelValue("Industry", industry || "Not provided")}
            {labelValue("Company size", profile?.teamSize || "Not provided")}
          </div>

          <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
            <h2 className="text-lg font-semibold">About</h2>
            <p className="mt-2 text-sm text-white/80">
              {bio || "This company has not added a bio yet."}
            </p>
          </section>
        </div>
        <Footer />
      </main>
    </>
  );
}
