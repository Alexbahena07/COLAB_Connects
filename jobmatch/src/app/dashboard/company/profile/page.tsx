import type { ReactNode } from "react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CompanyEditDrawer from "@/components/profile/CompanyEditDrawer";
import ProfileHeroActions from "@/components/profile/ProfileHeroActions";
import Header from "@/components/ui/HeaderWithIcons";
import Footer from "@/components/ui/Footer";

type SectionCardProps = {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
};

function SectionCard({ title, icon, action, children }: SectionCardProps) {
  return (
    <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm ring-1 ring-black/5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {icon && (
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand">
                {icon}
              </span>
            )}
            <h2 className="text-lg font-semibold uppercase tracking-tight text-brand">{title}</h2>
          </div>
          <div className="h-0.5 w-10 rounded-full bg-brandBlue" />
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export default async function CompanyProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");
  if (session.user.accountType !== "COMPANY") redirect("/dashboard/profile");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      image: true,
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

  const cp = user?.companyProfile;
  const companyName = cp?.companyName ?? session.user.name ?? "Your company";
  const profilePhoto = user?.image ?? (session.user?.image as string | null | undefined) ?? null;
  const website = cp?.website?.trim() ?? null;
  const headquarters = cp?.headquarters?.trim() ?? null;
  const teamSize = cp?.teamSize?.trim() ?? null;
  const hiringFocus = cp?.hiringFocus?.trim() ?? null;
  const about = cp?.about?.trim() ?? null;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background px-4 pb-16 pt-10 text-foreground">
        <div className="mx-auto w-full max-w-6xl space-y-8">

          {/* Hero band */}
          <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-brandBlue px-6 pb-6 pt-10 shadow-lg">
            <div className="pointer-events-none absolute inset-0 opacity-30 mix-blend-soft-light">
              <div className="absolute -left-10 -top-10 h-48 w-48 rounded-full bg-white/20 blur-3xl" />
              <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-[#f5f1ff]/20 blur-3xl" />
            </div>

            <div className="relative space-y-4 sm:space-y-5">
              {/* Logo + name row */}
              <div className="flex items-start gap-4 sm:items-center sm:gap-6">
                {/* Company logo / avatar */}
                {profilePhoto ? (
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-3xl border-4 border-white/60 bg-surface shadow-xl ring-2 ring-white/20 sm:h-28 sm:w-28">
                    <Image
                      src={profilePhoto}
                      alt={`${companyName} logo`}
                      fill
                      sizes="112px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-surface text-2xl font-semibold text-brand shadow-xl ring-2 ring-white/20 sm:h-28 sm:w-28 sm:text-3xl">
                    {companyName.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0 flex-1 pt-1 sm:pt-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f4e7ff]/80">
                    Company Profile
                  </p>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#fdfbff] sm:text-4xl">
                    {companyName}
                  </h1>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3">
                <CompanyEditDrawer profilePhoto={profilePhoto} />
                <ProfileHeroActions />
              </div>
            </div>
          </div>

          {/* Profile view */}
          <div className="grid gap-6">

            <section className="space-y-6">
              <SectionCard
                title="About"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <rect x="2" y="7" width="20" height="15" rx="2"/>
                    <path d="M16 2v4M8 2v4M2 11h20"/>
                  </svg>
                }
              >
                {about ? (
                  <p className="text-sm leading-relaxed text-foreground/90">{about}</p>
                ) : (
                  <p className="text-sm text-foreground/70">
                    Share your company&apos;s mission, culture, and what makes it a great place to build a career.
                    Use Edit Profile to add an about section.
                  </p>
                )}
              </SectionCard>

              <SectionCard
                title="Company Details"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                }
              >
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Headquarters</dt>
                    <dd className="text-sm text-foreground/90">{headquarters ?? "Not specified"}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Team size</dt>
                    <dd className="text-sm text-foreground/90">{teamSize ?? "Not specified"}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Hiring focus</dt>
                    <dd className="text-sm text-foreground/90">{hiringFocus ?? "Not specified"}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Website</dt>
                    {website ? (
                      <dd className="mt-1">
                        <a
                          href={website}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
                        >
                          Visit website
                        </a>
                      </dd>
                    ) : (
                      <dd className="text-sm text-foreground/90">Not provided</dd>
                    )}
                  </div>
                </dl>
              </SectionCard>
            </section>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
