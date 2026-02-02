// src/app/page.tsx
import Link from "next/link";
import Button from "@/components/ui/Button";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />

      {/* Hero */}
      <section className="relative flex min-h-screen items-center overflow-hidden">
        <div className="absolute inset-0 home-hero-bg" />
        <div className="absolute -left-12 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6 py-24">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
                COLAB Connects
              </p>

              <h1 className="mt-3 font-serif text-4xl font-bold leading-tight text-white md:text-5xl">
                A hiring hub built for early-career finance talent and growing teams.
              </h1>

              <p className="mt-4 text-lg text-white/85">
                Candidates search and apply to curated roles, save favorites, and follow
                companies. Employers publish jobs, review applicants by skill, and tell
                their story with a polished company profile.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/register">
                  <Button className="btn-brand border border-white/20 bg-white text-brand hover:bg-white/15">
                    Join as a candidate
                  </Button>
                </Link>
                <Link href="/register?type=company">
                  <Button className="btn-brand border border-white/20 bg-white/10 text-white hover:bg-white/15">
                    Join as a company
                  </Button>
                </Link>
                <Link href="/login">
                  <Button className="btn-brand border border-white/20 bg-transparent text-white hover:bg-white/10">
                    Log in
                  </Button>
                </Link>
              </div>
            </div>

            {/* Hero mock panels */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Candidate dashboard</h3>
                  <span className="rounded-md bg-white/15 px-2 py-1 text-xs text-white/90">
                    Search + Apply
                  </span>
                </div>

                <ul className="mt-4 space-y-3 text-sm">
                  {[
                    {
                      title: "Investment Analyst",
                      company: "Northbridge Capital",
                      meta: "New York - Full-time",
                    },
                    {
                      title: "Risk & Compliance Associate",
                      company: "Harborview Bank",
                      meta: "Chicago - Full-time",
                    },
                    {
                      title: "FP&A Intern",
                      company: "Summit Wealth Partners",
                      meta: "Boston - Internship",
                    },
                  ].map((job) => (
                    <li
                      key={job.title}
                      className="rounded-lg border border-white/10 bg-white/10 p-3"
                    >
                      <p className="font-semibold text-white">{job.title}</p>
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

              <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Company workspace</h3>
                  <span className="rounded-md bg-white/15 px-2 py-1 text-xs text-white/90">
                    Review applicants
                  </span>
                </div>

                <ul className="mt-4 space-y-3 text-sm">
                  {[
                    {
                      name: "Jamie Lee",
                      role: "Credit Analyst",
                      skills: "DCF, Excel, Credit Memo",
                    },
                    {
                      name: "Priya Shah",
                      role: "Treasury Analyst",
                      skills: "Cash Forecasting, SQL, Power BI",
                    },
                  ].map((candidate) => (
                    <li
                      key={candidate.name}
                      className="rounded-lg border border-white/10 bg-white/10 p-3"
                    >
                      <p className="font-semibold text-white">{candidate.name}</p>
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

        <div className="h-px w-full bg-white/10" />
      </section>

      {/* How it works */}
      <section className="home-section">
        <div className="mx-auto max-w-6xl px-6 py-16 ">
          <h2 className="text-2xl font-bold text-foreground">How COLAB works</h2>
          <p className="mt-2 max-w-2xl text-sm text-(--foreground)/90">
            A simple workflow for candidates and employers—built for early-career hiring.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Build your profile",
                desc: "Add education, experience, skills, and a resume so companies can evaluate fast.",
              },
              {
                title: "Search and apply",
                desc: "Filter by role, type, location, or remote. Save and revisit roles anytime.",
              },
              {
                title: "Hire with context",
                desc: "Companies publish roles, review applicants, and save promising candidates by skill.",
              },
            ].map((c) => (
              <div
                key={c.title}
                className="rounded-2xl border border-border bg-background p-6 shadow-sm"
              >
                <div className="pill-brandBlue">
                  {c.title}
                </div>
                <p className="mt-3 text-sm text-(--foreground)/90">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product highlight */}
      <section className="home-section py-14">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-3xl border border-border bg-background p-8 shadow-sm ring-1 ring-white/5">
            <div className="grid items-center gap-8 md:grid-cols-2">
              {/* LEFT: brand block behind heading + copy */}
              <div className="rounded-3xl bg-brand p-8 ring-1 ring-white/10">
                <h3 className="text-xl font-bold text-white">Built for real workflows</h3>
                <p className="mt-2 text-white/90">
                  Candidates track applications and get notified when new roles go live.
                  Companies manage listings, review applicants, and keep follow-ups organized.
                </p>

                <div className="mt-6 flex gap-3">
                  <Link href="/register">
                    <Button className="btn-brand bg-brandBlue text-white hover:opacity-95">
                      Get Started
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button className="btn-outline-brand text-white! border-white/40! hover:bg-white/10">
                      Log in
                    </Button>
                  </Link>
                </div>
              </div>

              {/* RIGHT: brand cards behind each feature row */}
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="space-y-3">
                  {[
                    { title: "Saved jobs", value: "Quick access to top picks" },
                    { title: "Notifications", value: "New roles from followed companies" },
                    { title: "Applicant review", value: "Skill-first candidate lists" },
                    { title: "Company profile", value: "Share mission and hiring focus" },
                  ].map((row) => (
                    <div
                      key={row.title}
                      className="rounded-xl bg-brand p-4 shadow-sm ring-1 ring-white/10"
                    >
                      <p className="text-sm font-semibold text-white">{row.title}</p>
                      <p className="text-xs text-white/85">{row.value}</p>
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-xs text-(--foreground)/75">
                  Sample modules available today
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dual CTA */}
      <section className="home-section">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-white">For Candidates</h3>
              <p className="mt-2 text-(--foreground)/90">
                Build a credible profile and apply to roles with a single dashboard.
              </p>
              <Link href="/register">
                <Button className="mt-4 btn-brand bg-brandBlue text-white hover:opacity-95">
                  Create Profile
                </Button>
              </Link>
            </div>

            <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-white">For Companies</h3>
              <p className="mt-2 text-(--foreground)/90">
                Publish jobs, review applicants by skill, and showcase your team.
              </p>
              <Link href="/register?type=company">
                <Button className="mt-4 btn-outline-brand text-white! border-white/40! hover:bg-white/10">
                  Start Recruiting
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
