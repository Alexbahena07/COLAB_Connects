import type { ReactNode } from "react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProfileHeroActions, { OpenToWorkToggle } from "@/components/profile/ProfileHeroActions";
import ProfileEditExitButton from "@/components/profile/ProfileEditExitButton";
import ProfileForm from "@/app/onboarding/profile/profile-form";
import Header from "@/components/ui/Header_with_Icons";
import Footer from "@/components/ui/Footer";

type ExperienceItem = {
  id: string;
  title: string | null;
  company: string | null;
  startDate: Date | null;
  endDate: Date | null;
  description: string | null;
};

type DegreeItem = {
  id: string;
  school: string | null;
  degree: string | null;
  field: string | null;
  startDate: Date | null;
  endDate: Date | null;
};

type CertificateItem = {
  id: string;
  name: string | null;
  issuer: string | null;
  issuedAt: Date | null;
  credentialId: string | null;
  credentialUrl: string | null;
};

type SkillItem = {
  id: string;
  name: string;
  years: number | null;
};

type SectionCardProps = {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
};

function formatMonthYear(value: Date | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", { month: "2-digit", year: "numeric" }).format(value);
}

function rangeLabel(start: Date | null, end: Date | null): string | null {
  const startLabel = formatMonthYear(start);
  const endLabel = end ? formatMonthYear(end) : "Present";
  if (!startLabel && !endLabel) return null;
  if (!startLabel) return endLabel;
  if (!endLabel) return startLabel;
  return `${startLabel} - ${endLabel}`;
}

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
            <h2 className="text-lg font-semibold tracking-tight text-brand uppercase">
              {title}
            </h2>
          </div>
          <div className="h-0.5 w-10 rounded-full bg-brandBlue" />
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export default async function StudentProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      image: true,
      profile: {
        select: {
          firstName: true,
          lastName: true,
          headline: true,
          desiredLocation: true,
          resumeFileName: true,
          resumeFileType: true,
        },
      },
      experiences: {
        orderBy: { startDate: "desc" },
        select: {
          id: true,
          title: true,
          company: true,
          startDate: true,
          endDate: true,
          description: true,
        },
      },
      degrees: {
        orderBy: { startDate: "desc" },
        select: {
          id: true,
          school: true,
          degree: true,
          field: true,
          startDate: true,
          endDate: true,
        },
      },
      certificates: {
        orderBy: { issuedAt: "desc" },
        select: {
          id: true,
          name: true,
          issuer: true,
          issuedAt: true,
          credentialId: true,
          credentialUrl: true,
        },
      },
      userSkills: {
        select: {
          id: true,
          years: true,
          skill: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  const profile = user?.profile;
  const fullName =
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() ||
    session.user.name ||
    session.user.email;
  const userImage = user?.image ?? (session.user?.image as string | null | undefined) ?? null;
  const resumeFileName = profile?.resumeFileName ?? null;
  const resumeAvailable = Boolean(resumeFileName);
  const headline = profile?.headline?.trim() ?? "";
  const location = profile?.desiredLocation?.trim();
  const experiences: ExperienceItem[] = user?.experiences ?? [];
  const degrees: DegreeItem[] = user?.degrees ?? [];
  const certificates: CertificateItem[] = user?.certificates ?? [];
  const skills: SkillItem[] =
    user?.userSkills.map((userSkill) => ({
      id: userSkill.id,
      name: userSkill.skill.name,
      years: userSkill.years,
    })) ?? [];

  const aboutText = headline;
  const topSkills = [...skills]
    .sort((a, b) => (b.years ?? 0) - (a.years ?? 0))
    .slice(0, 3);

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
              {/* Avatar */}
              {userImage ? (
                <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-3xl border-4 border-white/60 bg-surface shadow-xl ring-2 ring-(--brandBlue)/50">
                  <Image
                    src={userImage}
                    alt={`${fullName} profile photo`}
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl bg-surface text-3xl font-semibold text-brand shadow-xl ring-2 ring-(--brandBlue)/40">
                  {fullName.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Main hero info */}
              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f4e7ff]/80">
                    Student profile
                  </p>
                  <h1 className="mt-1 text-4xl font-bold tracking-tight text-[#fdfbff]">
                    {fullName}
                  </h1>
                  {headline ? (
                    <p className="mt-2 max-w-2xl text-sm text-[#fdfbff]/90">
                      {headline}
                    </p>
                  ) : (
                    <p className="mt-2 max-w-2xl text-sm text-[#fdfbff]/80">
                      Add a short headline to quickly tell recruiters who you are and what you're looking for.
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-[#fdfbff]/90">
                  <span className="inline-flex items-center gap-2 rounded-full bg-black/15 px-3 py-1 backdrop-blur-sm">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                    {location ? `Based in ${location}` : "Location not specified"}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-black/15 px-3 py-1 backdrop-blur-sm">
                    <OpenToWorkToggle />
                  </span>
                  {skills.length > 0 ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-black/15 px-3 py-1 backdrop-blur-sm">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                      {skills.length} skills listed
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-3">
                  <ProfileHeroActions redirectTo="/dashboard/profile" />
                </div>
              </div>
            </div>
          </div>

          <div id="profile-edit" className="profile-edit">
            <section className="rounded-3xl border border-border bg-surface p-6 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    Edit mode
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-foreground">Update your profile</h2>
                </div>
                <ProfileEditExitButton />
              </div>
              <div className="mt-6">
                <ProfileForm redirectTo="/dashboard/profile" />
              </div>
            </section>
          </div>

          {/* Content grid */}
          <div id="profile-view" className="profile-view grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
            {/* Left column */}
            <section className="space-y-6">
              <SectionCard title="About" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>}>
                {aboutText ? (
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {aboutText}
                  </p>
                ) : (
                  <p className="text-sm text-foreground/70">
                    Share a short introduction that highlights your goals, strengths, and what you are looking for
                    next. Use Edit Profile to add a headline or summary.
                  </p>
                )}
              </SectionCard>

              <SectionCard
                title="Resume"
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>}
                action={
                  resumeAvailable ? (
                    <a
                      href="/api/profile/resume"
                      target="_blank"
                      rel="noreferrer"
                      className="btn-brand whitespace-nowrap text-xs"
                    >
                      View resume
                    </a>
                  ) : undefined
                }
              >
                {resumeAvailable ? (
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{resumeFileName}</p>
                      <p className="text-xs text-foreground/70">Uploaded during onboarding</p>
                      <p className="text-[11px] uppercase tracking-wide text-foreground/60">
                        Opens in a new tab so you can verify what employers will see.
                      </p>
                    </div>
                    <div className="hidden h-10 w-10 items-center justify-center rounded-xl bg-brandBlue/10 text-brandBlue sm:flex">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><path d="M12 5v14"/><path d="m7 15 5 5 5-5"/><path d="M5 20h14"/></svg>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-foreground/70">
                    Upload your resume during onboarding to help companies understand your experience at a glance.
                  </p>
                )}
              </SectionCard>

              <SectionCard title="Experience" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>}>
                {experiences.length ? (
                  <ol className="relative space-y-5 border-l border-dashed border-border/80 pl-5">
                    {experiences.map((experience) => {
                      const period = rangeLabel(experience.startDate, experience.endDate);
                      const metadata = [experience.company, period].filter(Boolean).join(" · ");
                      const description = experience.description?.trim();
                      return (
                        <li key={experience.id} className="relative">
                          <span className="absolute -left-[9px] top-2 h-3 w-3 rounded-full border border-brandBlue bg-surface" />
                          <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                            <h3 className="text-sm font-semibold text-brand">
                              {experience.title || "Role"}
                            </h3>
                            {metadata ? (
                              <p className="mt-1 text-xs text-foreground/70">{metadata}</p>
                            ) : null}
                            {description ? (
                              <div className="mt-3 space-y-1.5 text-sm leading-relaxed text-foreground/90">
                                {description.split("\n").map((paragraph, index) => (
                                  <p key={index}>{paragraph}</p>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className="text-sm text-foreground/70">
                    Add internships, part-time roles, or meaningful projects to show how you apply your skills in practice.
                  </p>
                )}
              </SectionCard>

              <SectionCard title="Education" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/></svg>}>
                {degrees.length ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {degrees.map((degree) => {
                      const period = rangeLabel(degree.startDate, degree.endDate);
                      const subtitle = [degree.degree, degree.field].filter(Boolean).join(" · ");
                      return (
                        <div
                          key={degree.id}
                          className="rounded-2xl border border-border bg-surface p-4 shadow-sm"
                        >
                          <h3 className="text-sm font-semibold text-brand">
                            {degree.school || "Institution"}
                          </h3>
                          {subtitle ? (
                            <p className="mt-1 text-xs text-foreground/80">{subtitle}</p>
                          ) : null}
                          {period ? (
                            <p className="mt-1 text-[11px] uppercase tracking-wide text-foreground/60">
                              {period}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-foreground/70">
                    Include your degree programs so recruiters know your academic background.
                  </p>
                )}
              </SectionCard>

              <SectionCard title="Licenses & Certifications" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>}>
                {certificates.length ? (
                  <div className="space-y-4">
                    {certificates.map((certificate) => {
                      const issued = formatMonthYear(certificate.issuedAt);
                      const credentialMeta = [issued, certificate.issuer].filter(Boolean).join(" · ");
                      return (
                        <div
                          key={certificate.id}
                          className="rounded-2xl border border-border bg-surface p-4 shadow-sm"
                        >
                          <h3 className="text-sm font-semibold text-brand">
                            {certificate.name || "Certification"}
                          </h3>
                          {credentialMeta ? (
                            <p className="mt-1 text-xs text-foreground/80">{credentialMeta}</p>
                          ) : null}
                          {certificate.credentialId ? (
                            <p className="mt-1 text-[11px] uppercase tracking-wide text-foreground/60">
                              Credential ID: {certificate.credentialId}
                            </p>
                          ) : null}
                          {certificate.credentialUrl ? (
                            <a
                              href={certificate.credentialUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-flex text-xs font-semibold text-brandBlue"
                            >
                              View credential
                            </a>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-foreground/70">
                    Highlight certifications or licenses that demonstrate your specialization.
                  </p>
                )}
              </SectionCard>

              <SectionCard title="Skills" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>}>
                {skills.length ? (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <span
                        key={skill.id}
                        className="flex items-center gap-1 rounded-full bg-brandBlue px-3 py-1 text-xs font-semibold text-white shadow-sm"
                      >
                        {skill.name}
                        {typeof skill.years === "number" ? (
                          <span className="text-[10px] font-normal opacity-80">{skill.years}y</span>
                        ) : null}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-foreground/70">
                    Add skills so companies can quickly see where you excel.
                  </p>
                )}
              </SectionCard>
            </section>

            {/* Right column */}
            <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-3xl border border-brandBlue bg-brandBlue p-6 text-white shadow-sm">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  Contact
                </h3>
                <p className="mt-2 text-sm text-white/90">{session.user.email}</p>
                <div className="mt-4 border-t border-dashed border-white/40 pt-4">
                  <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    Top skills
                  </h4>
                  {topSkills.length ? (
                    <ul className="mt-3 space-y-2 text-sm">
                      {topSkills.map((skill) => (
                        <li
                          key={skill.id}
                          className="flex items-center justify-between rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-white shadow-sm"
                        >
                          <span>{skill.name}</span>
                          {typeof skill.years === "number" ? (
                            <span className="text-[10px] uppercase tracking-wide text-white/70">
                              {skill.years} yrs
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-white/80">
                      Add skills to spotlight your strengths.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-brandBlue bg-brandBlue p-6 text-white shadow-sm">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
                  Suggested improvements
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-white/90">
                  <li className="flex items-start gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/70" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
                    <span>Add an "About" summary to share your story.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/70" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
                    <span>Upload coursework or projects under Experience.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/70" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
                    <span>List certifications that validate your expertise.</span>
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

