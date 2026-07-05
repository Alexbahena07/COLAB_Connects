import type { ReactNode } from "react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CompanyEditDrawer from "@/components/profile/CompanyEditDrawer";
import ProfileHeroActions from "@/components/profile/ProfileHeroActions";
import Header from "@/components/ui/Header_with_Icons";
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

            <div className="relative flex flex-wrap items-start gap-6">
              {/* Company logo / avatar */}
              {profilePhoto ? (
                <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-3xl border-4 border-white/60 bg-surface shadow-xl ring-2 ring-white/20">
                  <Image
                    src={profilePhoto}
                    alt={`${companyName} logo`}
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl bg-surface text-3xl font-semibold text-brand shadow-xl ring-2 ring-white/20">
                  {companyName.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Main info */}
              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f4e7ff]/80">
                    Company Profile
                  </p>
                  <h1 className="mt-1 text-4xl font-bold tracking-tight text-[#fdfbff]">
                    {companyName}
                  </h1>
                  {about ? (
                    <p className="mt-2 max-w-2xl text-sm text-[#fdfbff]/90 line-clamp-2">{about}</p>
                  ) : (
                    <p className="mt-2 max-w-2xl text-sm text-[#fdfbff]/75">
                      Add an about section to tell candidates what makes your company a great place to work.
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-[#fdfbff]/90">
                  {headquarters ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-black/15 px-3 py-1 backdrop-blur-sm">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                      {headquarters}
                    </span>
                  ) : null}
                  {teamSize ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-black/15 px-3 py-1 backdrop-blur-sm">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true"><circle cx="9" cy="7" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="7" r="3"/><path d="M21 20c0-3.3-2.7-6-6-6"/></svg>
                      {teamSize}
                    </span>
                  ) : null}
                  {hiringFocus ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-black/15 px-3 py-1 backdrop-blur-sm">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true"><rect x="4" y="7" width="16" height="11" rx="2"/><path d="M9 7V5.5a2.5 2.5 0 0 1 5 0V7"/></svg>
                      {hiringFocus}
                    </span>
                  ) : null}
                  {website ? (
                    <a
                      href={website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-black/15 px-3 py-1 backdrop-blur-sm hover:bg-black/25 transition"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                      Website
                    </a>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <CompanyEditDrawer profilePhoto={profilePhoto} />
                  <ProfileHeroActions />
                </div>
              </div>
            </div>
          </div>

          {/* Profile view */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">

            {/* Left column */}
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
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                }
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailRow
                    label="Headquarters"
                    value={headquarters}
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                        <circle cx="12" cy="9" r="2.5"/>
                      </svg>
                    }
                    placeholder="Not specified"
                  />
                  <DetailRow
                    label="Team size"
                    value={teamSize}
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <circle cx="9" cy="7" r="3"/>
                        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/>
                        <circle cx="17" cy="7" r="3"/>
                        <path d="M21 20c0-3.3-2.7-6-6-6"/>
                      </svg>
                    }
                    placeholder="Not specified"
                  />
                  <DetailRow
                    label="Hiring focus"
                    value={hiringFocus}
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <rect x="4" y="7" width="16" height="11" rx="2"/>
                        <path d="M9 7V5.5a2.5 2.5 0 0 1 5 0V7"/>
                      </svg>
                    }
                    placeholder="Not specified"
                  />
                  <DetailRow
                    label="Website"
                    value={website}
                    href={website ?? undefined}
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                      </svg>
                    }
                    placeholder="Not provided"
                  />
                </div>
              </SectionCard>
            </section>

            {/* Right sidebar */}
            <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-3xl border border-brandBlue bg-brandBlue p-6 text-white shadow-sm">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  Contact
                </h3>
                <p className="mt-2 text-sm text-white/90">{session.user.email}</p>
                {website ? (
                  <a
                    href={website}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block text-sm text-white/80 underline underline-offset-4 hover:text-white"
                  >
                    {website.replace(/^https?:\/\//, "")}
                  </a>
                ) : null}
              </div>

              <div className="rounded-3xl border border-brandBlue bg-brandBlue p-6 text-white shadow-sm">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
                  Profile tips
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-white/90">
                  <li className="flex items-start gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/70" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
                    <span>Add an &quot;About&quot; to attract candidates who align with your culture.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/70" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
                    <span>Upload a company logo so candidates can recognize your brand.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/70" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
                    <span>Keep hiring focus up to date so the right talent applies.</span>
                  </li>
                </ul>
              </div>
            </aside>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}

type DetailRowProps = {
  label: string;
  value: string | null;
  icon: ReactNode;
  placeholder: string;
  href?: string;
};

function DetailRow({ label, value, icon, placeholder, href }: DetailRowProps) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-background p-4 shadow-sm">
      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
        {value && href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="mt-0.5 block truncate text-sm font-medium text-brandBlue underline underline-offset-4"
          >
            {value}
          </a>
        ) : (
          <p className={`mt-0.5 text-sm ${value ? "font-medium text-foreground" : "text-muted/60"}`}>
            {value ?? placeholder}
          </p>
        )}
      </div>
    </div>
  );
}
