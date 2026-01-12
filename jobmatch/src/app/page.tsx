// src/app/page.tsx
import Link from "next/link";
import Button from "@/components/ui/Button";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-[--surface] text-[--brand]">
      {/* Top bar */}
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[--brand] via-[#3a1f4d] to-[--brandBlue]" />
        <div className="absolute -left-12 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-6 py-24 text-white">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
                COLAB connects
              </p>
              <h1 className="mt-3 text-4xl font-bold leading-tight md:text-5xl font-serif">
                A hiring hub built for student talent and growing teams.
              </h1>
              <p className="mt-4 text-lg text-white/85">
                Students search and apply to curated roles, save favorites, and follow
                companies. Employers publish jobs, review applicants by skill, and tell
                their story with a polished company profile.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[--brand] transition hover:opacity-90"
                >
                  Join as a student
                </Link>
                <Link
                  href="/register?type=company"
                  className="inline-flex items-center justify-center rounded-xl border border-white/80 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Join as a company
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-xl border border-white/40 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
                >
                  Log in
                </Link>
              </div>
            </div>

            {/* Hero mock panels */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Student dashboard</h3>
                  <span className="rounded-md bg-white/15 px-2 py-1 text-xs">
                    Search + Apply
                  </span>
                </div>
                <ul className="mt-4 space-y-3 text-sm">
                  {[
                    { title: "Frontend Engineer", company: "Nova Labs", meta: "Remote - Full-time" },
                    { title: "Data Engineer", company: "Acme Analytics", meta: "Remote - Full-time" },
                    { title: "Software Intern", company: "BrightStart", meta: "Austin - Internship" },
                  ].map((job) => (
                    <li
                      key={job.title}
                      className="rounded-lg border border-white/15 bg-white/10 p-3"
                    >
                      <p className="font-semibold">{job.title}</p>
                      <p className="text-white/80">{job.company}</p>
                      <p className="text-xs text-white/70">{job.meta}</p>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex items-center gap-2 text-xs text-white/70">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-300" />
                  Save, share, and follow companies
                </div>
              </div>

              <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Company workspace</h3>
                  <span className="rounded-md bg-white/15 px-2 py-1 text-xs">
                    Review applicants
                  </span>
                </div>
                <ul className="mt-4 space-y-3 text-sm">
                  {[
                    { name: "Jamie Lee", role: "Product Designer", skills: "Figma, UX, Branding" },
                    { name: "Priya Shah", role: "Data Analyst", skills: "SQL, Python, Tableau" },
                  ].map((candidate) => (
                    <li
                      key={candidate.name}
                      className="rounded-lg border border-white/15 bg-white/10 p-3"
                    >
                      <p className="font-semibold">{candidate.name}</p>
                      <p className="text-white/80">{candidate.role}</p>
                      <p className="text-xs text-white/70">{candidate.skills}</p>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex items-center gap-2 text-xs text-white/70">
                  <span className="inline-flex h-2 w-2 rounded-full bg-sky-200" />
                  Filter applicants by skill and save top picks
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-bold text-[--brand]">How COLAB works</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Build your profile",
              desc: "Students import LinkedIn data, add skills, and upload a resume so companies see proof fast.",
            },
            {
              title: "Search and apply",
              desc: "Filter by role, type, location, or remote. Save and share jobs you want to revisit.",
            },
            {
              title: "Hire with context",
              desc: "Companies publish roles, review applicants, and save promising candidates by skill.",
            },
          ].map((c) => (
            <div key={c.title} className="card">
              <div className="mb-3 inline-block rounded-lg bg-[--brandBlue] px-2 py-1 text-xs font-semibold text-white">
                {c.title}
              </div>
              <p className="text-[--brandBlue]">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Product highlight */}
      <section className="bg-[--surface] py-14">
        <div className="mx-auto max-w-6xl px-6">
          <div className="card-wide">
            <div className="grid items-center gap-8 md:grid-cols-2">
              <div>
                <h3 className="text-xl font-bold text-[--brand]">Built for real workflows</h3>
                <p className="mt-2 text-[--brandBlue]">
                  Students track applications and get notified when new roles go live.
                  Companies manage listings, review applicants, and keep follow-ups organized.
                </p>
                <div className="mt-6 flex gap-3">
                  <Link href="/register">
                    <Button className="btn-brand">Get Started</Button>
                  </Link>
                  <Link href="/login">
                    <Button className="btn-outline-brand">Log in</Button>
                  </Link>
                </div>
              </div>

              <div className="rounded-xl border border-[--border] p-4">
                {[
                  { title: "Saved jobs", value: "Quick access to top picks" },
                  { title: "Notifications", value: "New roles from followed companies" },
                  { title: "Applicant review", value: "Skill-first candidate lists" },
                  { title: "Company profile", value: "Share mission and hiring focus" },
                ].map((row) => (
                  <div key={row.title} className="mb-3 rounded-lg border border-[--border] bg-white/5 p-3">
                    <p className="text-sm font-semibold text-[--brand]">{row.title}</p>
                    <p className="text-xs text-[--brandBlue]">{row.value}</p>
                  </div>
                ))}
                <p className="mt-3 text-xs text-[--brandBlue]">Sample modules available today</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dual CTA */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="card">
            <h3 className="text-lg font-semibold text-[--brand]">For Candidates</h3>
            <p className="mt-2 text-[--brandBlue]">
              Build a credible skills profile, connect LinkedIn, and apply to roles with a single dashboard.
            </p>
            <Link href="/register">
              <Button className="mt-4 btn-brand">Create Profile</Button>
            </Link>
          </div>
          <div className="card">
            <h3 className="text-lg font-semibold text-[--brand]">For Companies</h3>
            <p className="mt-2 text-[--brandBlue]">
              Publish jobs, review applicants by skill, and showcase your team to student talent.
            </p>
            <Link href="/register?type=company">
              <Button className="mt-4 btn-outline-brand">Start Recruiting</Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
