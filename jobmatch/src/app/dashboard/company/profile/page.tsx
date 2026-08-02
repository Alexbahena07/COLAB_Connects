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
  const websiteHost = website
    ? (() => {
        try {
          return new URL(website).hostname.replace(/^www\./, "");
        } catch {
          return website;
        }
      })()
    : null;
  const headquarters = cp?.headquarters?.trim() ?? null;
  const teamSize = cp?.teamSize?.trim() ?? null;
  const hiringFocus = cp?.hiringFocus?.trim() ?? null;
  const about = cp?.about?.trim() ?? null;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background px-4 pb-16 pt-10 text-foreground">
        <div className="mx-auto w-full max-w-6xl space-y-8">

          {/* Profile layout: hero + About on the left, Company Details on the right */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
            <div className="space-y-6">
              {/* Hero band */}
              <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-brandBlue px-6 py-7 shadow-lg sm:py-8">
                <div className="pointer-events-none absolute inset-0 opacity-30 mix-blend-soft-light">
                  <div className="absolute -left-10 -top-10 h-48 w-48 rounded-full bg-white/20 blur-3xl" />
                  <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-[#f5f1ff]/20 blur-3xl" />
                </div>

                {/* Logo + everything else, side by side */}
                <div className="relative flex items-center gap-4 sm:gap-6">
                  {/* Company logo / avatar */}
                  {profilePhoto ? (
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-3xl border-4 border-white/60 bg-surface shadow-xl ring-2 ring-white/20 sm:h-32 sm:w-32">
                      <Image
                        src={profilePhoto}
                        alt={`${companyName} logo`}
                        fill
                        sizes="128px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-surface text-2xl font-semibold text-brand shadow-xl ring-2 ring-white/20 sm:h-32 sm:w-32 sm:text-3xl">
                      {companyName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1 space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f4e7ff]/80">
                        Company Profile
                      </p>
                      <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#fdfbff] sm:text-4xl">
                        {companyName}
                      </h1>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-3">
                      <CompanyEditDrawer profilePhoto={profilePhoto} />
                      <ProfileHeroActions />
                    </div>
                  </div>
                </div>
              </div>

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
            </div>

            {/* Company Details */}
            <aside className="space-y-6 lg:self-start">
              <div className="rounded-3xl border border-border bg-surface p-4 text-foreground shadow-sm ring-1 ring-black/5 sm:p-6 lg:border-brandBlue lg:bg-brandBlue lg:text-white lg:ring-0">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand lg:text-white">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                    <path d="M12 2C8.686 2 6 4.686 6 8c0 5.25 6 13 6 13s6-7.75 6-13c0-3.314-2.686-6-6-6Z" />
                    <circle cx="12" cy="8" r="2" />
                  </svg>
                  Headquarters
                </h3>
                <p className="mt-2 text-sm text-foreground/80 lg:text-white/90">
                  {headquarters || "Not specified"}
                </p>
              </div>

              <div className="rounded-3xl border border-border bg-surface p-4 text-foreground shadow-sm ring-1 ring-black/5 sm:p-6 lg:border-brandBlue lg:bg-brandBlue lg:text-white lg:ring-0">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand lg:text-white">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                    <circle cx="9" cy="7" r="3" />
                    <path d="M3 20c0-3.3 2.7-6 6-6h.5" />
                    <circle cx="17" cy="11" r="3" />
                    <path d="M13 20c0-2.8 1.8-5.2 4.3-6" />
                  </svg>
                  Team Size
                </h3>
                <p className="mt-2 text-sm text-foreground/80 lg:text-white/90">
                  {teamSize || "Not specified"}
                </p>
              </div>

              <div className="rounded-3xl border border-border bg-surface p-4 text-foreground shadow-sm ring-1 ring-black/5 sm:p-6 lg:border-brandBlue lg:bg-brandBlue lg:text-white lg:ring-0">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand lg:text-white">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                    <path d="M4 20V10l8-6 8 6v10" />
                    <rect x="9" y="14" width="6" height="6" />
                  </svg>
                  Hiring Focus
                </h3>
                <p className="mt-2 text-sm text-foreground/80 lg:text-white/90">
                  {hiringFocus || "Not specified"}
                </p>
              </div>

              <div className="rounded-3xl border border-border bg-surface p-4 text-foreground shadow-sm ring-1 ring-black/5 sm:p-6 lg:border-brandBlue lg:bg-brandBlue lg:text-white lg:ring-0">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand lg:text-white">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M2 12h20M12 2c-2.5 3-4 6.5-4 10s1.5 7 4 10M12 2c2.5 3 4 6.5 4 10s-1.5 7-4 10" />
                  </svg>
                  Website
                </h3>
                {website ? (
                  <a
                    href={website}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brandBlue underline-offset-2 hover:underline lg:text-white lg:underline"
                  >
                    {websiteHost}
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 shrink-0">
                      <path d="M7 17 17 7M7 7h10v10" />
                    </svg>
                  </a>
                ) : (
                  <p className="mt-2 text-sm text-foreground/80 lg:text-white/90">Not provided</p>
                )}
              </div>
            </aside>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
