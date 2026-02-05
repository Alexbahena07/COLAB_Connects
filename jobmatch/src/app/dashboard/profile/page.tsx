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

function SectionCard({ title, action, children }: SectionCardProps) {
  return (
    <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm ring-1 ring-black/5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-brand uppercase">
            {title}
          </h2>
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
      <main className="min-h-screen bg-linear-to-b from-brand via-background to-background px-4 pb-16 pt-10 text-foreground">
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
                      Add a short headline to quickly tell recruiters who you are and what you’re looking for.
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-[#fdfbff]/90">
                  <span className="inline-flex items-center gap-2 rounded-full bg-black/15 px-3 py-1 backdrop-blur-sm">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-300" />
                    {location ? `Based in ${location}` : "Location not specified"}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-black/15 px-3 py-1 backdrop-blur-sm">
                    <OpenToWorkToggle />
                  </span>
                  {skills.length > 0 ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-black/15 px-3 py-1 backdrop-blur-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-brandBlue" />
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
            <section className="rounded-3xl border border-white/20 bg-surface p-6 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                    Edit mode
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-white">Update your profile</h2>
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
              <SectionCard title="About">
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
                      ⬇
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-foreground/70">
                    Upload your resume during onboarding to help companies understand your experience at a glance.
                  </p>
                )}
              </SectionCard>

              <SectionCard title="Experience">
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

              <SectionCard title="Education">
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

              <SectionCard title="Licenses & Certifications">
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

              <SectionCard title="Skills">
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
                <h3 className="text-sm font-semibold uppercase tracking-wide">Contact</h3>
                <p className="mt-2 text-sm text-white/90">{session.user.email}</p>
                <div className="mt-4 border-t border-dashed border-white/40 pt-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wide">
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
                <h3 className="text-sm font-semibold uppercase tracking-wide">
                  Suggested improvements
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-white/90">
                  <li className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
                    <span>Add an “About” summary to share your story.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
                    <span>Upload coursework or projects under Experience.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
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

