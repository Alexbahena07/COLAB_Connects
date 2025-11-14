import type { ReactNode } from "react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import Button from "@/components/ui/Button";
import ProfileHeroActions, { OpenToWorkToggle } from "@/components/profile/ProfileHeroActions";
import Header from "@/components/ui/Header";

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

function initialsFromName(name: string): string {
  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return "ST";
  const first = parts[0]?.[0]?.toUpperCase() ?? "";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0]?.toUpperCase() ?? "" : "";
  const combined = `${first}${second}`;
  if (combined) return combined;
  return parts[0]?.slice(0, 2).toUpperCase() ?? "ST";
}

function SectionCard({ title, action, children }: SectionCardProps) {
  return (
    <section className="rounded-3xl border border-[--border] bg-[--surface] p-6 shadow-sm">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-[--brand]">{title}</h2>
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
  const initials = initialsFromName(fullName);
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
      <main className="min-h-screen bg-[--background] px-4 py-10 text-[--foreground]">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[2fr,1fr]">
        <section className="space-y-6">
          <article className="rounded-3xl border border-[--border] bg-[--surface] p-8 shadow-sm">
            <div className="flex flex-wrap items-start gap-6">
              {userImage ? (
                <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-[--surface] shadow-lg ring-2 ring-[--border]">
                  <Image src={userImage} alt={`${fullName} profile photo`} fill sizes="96px" className="object-cover" />
                </div>
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[--border] text-3xl font-semibold text-[--brand]">
                  {initials}
                </div>
              )}
              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="text-4xl font-bold text-[--brand]">{fullName}</h1>
                  {headline ? <p className="mt-2 text-base opacity-80">{headline}</p> : null}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm opacity-80">
                  <span className="rounded-full bg-[--background] px-3 py-1 text-[--surface]">
                    {location ? `Based in ${location}` : "Location not specified"}
                  </span>
                  <OpenToWorkToggle />
                </div>
                <ProfileHeroActions redirectTo="/dashboard/profile" />
              </div>
            </div>
          </article>

          <SectionCard title="About">
            {aboutText ? (
              <p className="text-base leading-relaxed opacity-90">{aboutText}</p>
            ) : (
              <p className="text-sm opacity-70">
                Share a short introduction that highlights your goals, strengths, and what you are looking for next. Use
                Edit Profile to add a headline or summary.
              </p>
            )}
          </SectionCard>

          <SectionCard title="Experience">
            {experiences.length ? (
              <ol className="relative space-y-6 border-l border-[--border] pl-6">
                {experiences.map((experience) => {
                  const period = rangeLabel(experience.startDate, experience.endDate);
                  const metadata = [experience.company, period].filter(Boolean).join(" | ");
                  const description = experience.description?.trim();
                  return (
                    <li key={experience.id} className="relative">
                      <span className="absolute -left-2 top-2 h-3 w-3 rounded-full border border-[--brand] bg-[--surface]" />
                      <div className="rounded-2xl border border-[--border] bg-[--surface] p-5 shadow-sm">
                        <h3 className="text-lg font-semibold text-[--brand]">
                          {experience.title || "Role"}
                        </h3>
                        {metadata ? <p className="mt-1 text-sm opacity-70">{metadata}</p> : null}
                        {description ? (
                          <div className="mt-3 space-y-2 text-sm leading-relaxed opacity-90">
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
              <p className="text-sm opacity-70">
                Add internships, part-time roles, or meaningful projects to show how you apply your skills in practice.
              </p>
            )}
          </SectionCard>

          <SectionCard title="Education">
            {degrees.length ? (
              <div className="space-y-4">
                {degrees.map((degree) => {
                  const period = rangeLabel(degree.startDate, degree.endDate);
                  const subtitle = [degree.degree, degree.field].filter(Boolean).join(" | ");
                  return (
                    <div key={degree.id} className="rounded-2xl border border-[--border] bg-[--surface] p-5 shadow-sm">
                      <h3 className="text-lg font-semibold text-[--brand]">
                        {degree.school || "Institution"}
                      </h3>
                      {subtitle ? <p className="mt-1 text-sm opacity-80">{subtitle}</p> : null}
                      {period ? <p className="mt-1 text-xs uppercase tracking-wide opacity-60">{period}</p> : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm opacity-70">
                Include your degree programs so recruiters know your academic background.
              </p>
            )}
          </SectionCard>

          <SectionCard title="Licenses & Certifications">
            {certificates.length ? (
              <div className="space-y-4">
                {certificates.map((certificate) => {
                  const issued = formatMonthYear(certificate.issuedAt);
                  const credentialMeta = [issued, certificate.issuer].filter(Boolean).join(" | ");
                  return (
                    <div key={certificate.id} className="rounded-2xl border border-[--border] bg-[--surface] p-5 shadow-sm">
                      <h3 className="text-lg font-semibold text-[--brand]">
                        {certificate.name || "Certification"}
                      </h3>
                      {credentialMeta ? (
                        <p className="mt-1 text-sm opacity-80">{credentialMeta}</p>
                      ) : null}
                      {certificate.credentialId ? (
                        <p className="mt-1 text-xs uppercase tracking-wide opacity-60">
                          Credential ID: {certificate.credentialId}
                        </p>
                      ) : null}
                      {certificate.credentialUrl ? (
                        <a
                          href={certificate.credentialUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex text-sm font-semibold text-[--brandBlue]"
                        >
                          View credential
                        </a>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm opacity-70">
                Highlight certifications or licenses that demonstrate your specialization.
              </p>
            )}
          </SectionCard>

          <SectionCard
            title="Skills"
            action={
              <Button
                type="button"
                className="border border-[--brandBlue] bg-[--surface] text-[--brand] hover:bg-[--background]"
              >
                Add skill
              </Button>
            }
          >
            {skills.length ? (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill.id}
                    className="flex items-center gap-1 rounded-full bg-[--brandBlue] px-3 py-1 text-sm font-semibold text-white shadow-sm"
                  >
                    {skill.name}
                    {typeof skill.years === "number" ? (
                      <span className="text-xs font-normal opacity-80">{skill.years}y</span>
                    ) : null}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm opacity-70">
                Add skills so companies can quickly see where you excel.
              </p>
            )}
          </SectionCard>
        </section>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-[--border] bg-[--surface] p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-[--brand]">Quick stats</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="opacity-70">Applications submitted</dt>
                <dd className="font-semibold">0</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="opacity-70">Skills listed</dt>
                <dd className="font-semibold">{skills.length}</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs uppercase tracking-wide opacity-50">Tracking enhancements coming soon.</p>
          </div>

          <div className="rounded-3xl border border-[--border] bg-[--surface] p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-[--brand]">Contact</h3>
            <p className="mt-2 text-sm opacity-80">{session.user.email}</p>
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-[--brand]">Top skills</h4>
              {topSkills.length ? (
                <ul className="mt-2 space-y-2 text-sm">
                  {topSkills.map((skill) => (
                    <li
                      key={skill.id}
                      className="flex items-center justify-between rounded-xl border border-[--border] bg-[--surface] px-3 py-2 shadow-sm"
                    >
                      <span>{skill.name}</span>
                      {typeof skill.years === "number" ? (
                        <span className="text-xs uppercase tracking-wide opacity-60">{skill.years} yrs</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm opacity-70">Add skills to spotlight your strengths.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-[--border] bg-[--surface] p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-[--brand]">Suggested improvements</h3>
            <ul className="mt-3 space-y-2 text-sm opacity-80">
              <li>- Add an \"About\" summary to share your story.</li>
              <li>- Upload recent coursework or projects under Experience.</li>
              <li>- List certifications that validate your expertise.</li>
            </ul>
          </div>
        </aside>
      </div>
      </main>
    </>
  );
}
