import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import Header from "@/components/ui/Header_with_Icons";
import Footer from "@/components/ui/Footer";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import FollowCompanyButton from "./FollowCompanyButton";

type CompanyProfilePageProps = {
  params: Promise<{ companyId: string }>;
};

function InfoCard({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface px-4 py-4">
      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
        {icon}
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default async function CompanyProfilePage({ params }: CompanyProfilePageProps) {
  const { companyId } = await params;

  const session = await getServerSession(authOptions);
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

  const viewerId = typeof session?.user?.id === "string" ? session.user.id : null;
  const canFollow = viewerId !== null && session?.user?.accountType === "STUDENT";
  let initialIsFollowing = false;
  if (canFollow) {
    const follow = await prisma.companyFollow.findUnique({
      where: { userId_companyId: { userId: viewerId, companyId } },
      select: { id: true },
    });
    initialIsFollowing = Boolean(follow);
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
      <main className="flex min-h-screen flex-col bg-background text-foreground">
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-8">

          {/* Page header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                  <path d="M3 21V7l9-4 9 4v14" />
                  <path d="M9 21V12h6v9" />
                  <path d="M3 21h18" />
                </svg>
                Company profile
              </p>
              <h1 className="mt-2 text-3xl font-bold text-brand">{companyName}</h1>
              <div className="mt-1.5 h-0.5 w-12 rounded-full bg-brandBlue" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {canFollow ? (
                <FollowCompanyButton
                  companyId={companyId}
                  initialIsFollowing={initialIsFollowing}
                />
              ) : null}
              <Link
                href="/dashboard"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-brand/30 px-4 text-sm font-semibold text-brand transition hover:bg-brand/5"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <path d="M19 12H5M12 5l-7 7 7 7" />
                </svg>
                Back to jobs
              </Link>
            </div>
          </div>

          {/* Info cards */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <InfoCard
              label="Website"
              icon={
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M2 12h20M12 2c-2.5 3-4 6.5-4 10s1.5 7 4 10M12 2c2.5 3 4 6.5 4 10s-1.5 7-4 10" />
                </svg>
              }
              value={
                website ? (
                  <a
                    href={website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brandBlue underline underline-offset-4 hover:opacity-80"
                  >
                    {website}
                  </a>
                ) : (
                  <span className="text-muted">Not provided</span>
                )
              }
            />
            <InfoCard
              label="Headquarters"
              icon={
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <path d="M12 2C8.686 2 6 4.686 6 8c0 5.25 6 13 6 13s6-7.75 6-13c0-3.314-2.686-6-6-6Z" />
                  <circle cx="12" cy="8" r="2" />
                </svg>
              }
              value={headquarters || <span className="text-muted">Not provided</span>}
            />
            <InfoCard
              label="Industry"
              icon={
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <path d="M4 20V10l8-6 8 6v10" />
                  <rect x="9" y="14" width="6" height="6" />
                </svg>
              }
              value={industry || <span className="text-muted">Not provided</span>}
            />
            <InfoCard
              label="Company size"
              icon={
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <circle cx="9" cy="7" r="3" />
                  <path d="M3 20c0-3.3 2.7-6 6-6h.5" />
                  <circle cx="17" cy="11" r="3" />
                  <path d="M13 20c0-2.8 1.8-5.2 4.3-6" />
                </svg>
              }
              value={profile?.teamSize || <span className="text-muted">Not provided</span>}
            />
          </div>

          {/* About section */}
          <section className="mt-6 rounded-3xl border border-border bg-surface p-6 shadow-sm ring-1 ring-black/5">
            <header className="mb-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                    <circle cx="12" cy="8" r="3.5" />
                    <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
                  </svg>
                </span>
                <h2 className="text-lg font-semibold uppercase tracking-tight text-brand">About</h2>
              </div>
              <div className="mt-1 h-0.5 w-10 rounded-full bg-brandBlue" />
            </header>
            <p className="text-sm leading-relaxed text-foreground/80">
              {bio || "This company has not added a bio yet."}
            </p>
          </section>
        </div>
        <Footer />
      </main>
    </>
  );
}
