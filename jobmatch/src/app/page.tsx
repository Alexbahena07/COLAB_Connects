// src/app/page.tsx
import Link from "next/link";
import Button from "@/components/ui/Button";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";
import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />

      {/* Hero */}
      <section className="relative min-h-[calc(100vh-80px)] min-h-[calc(100svh-80px)] overflow-hidden">
        <div className="absolute inset-0 bg-[url('/Backgrounds/EventPhoto.JPG')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute -left-12 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

        <div className="relative mx-auto flex min-h-[calc(100vh-80px)] min-h-[calc(100svh-80px)] max-w-6xl items-center px-6 py-24">
          <div className="grid w-full items-center gap-10 md:grid-cols-2 md:justify-items-center">
            <div className="w-full max-w-xl text-center">
              <div className="rounded-3xl border border-white/15 bg-black/55 px-6 py-6 text-white shadow-lg backdrop-blur-sm">
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

              <div className="mt-6 flex flex-wrap justify-center gap-3">
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
            </div>

            {/* Hero mock panels */}
            <div className="mx-auto w-full max-w-md space-y-4">
              <div className="rounded-2xl border border-white/15 bg-black/55 p-5 backdrop-blur">
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
                      className="rounded-lg border border-white/10 bg-black/55 p-3"
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

              <div className="rounded-2xl border border-white/15 bg-black/55 p-5 backdrop-blur">
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
                      className="rounded-lg border border-white/10 bg-black/55 p-3"
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

        <a
          href="#how-it-works"
          aria-label="Scroll to How COLAB works"
          className="absolute bottom-14 left-1/2 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition hover:bg-white/20"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </a>

        <div className="h-px w-full bg-white/10" />
      </section>

      {/* How it works */}
      <section className="home-section" id="how-it-works">
        <div className="mx-auto max-w-6xl px-6 py-16 ">
          <h2 className="text-center text-2xl font-bold text-foreground">
            How COLAB works
          </h2>
          <p className="mt-2 max-w-2xl text-center text-sm text-(--foreground)/90 mx-auto">
            A simple workflow for candidates and employers—built for early-career hiring.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Build your profile",
                desc: "Add education, experience, skills, and a resume so companies can evaluate fast.",
                icon: (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <circle cx="12" cy="7" r="4" />
                    <path d="M20 21a8 8 0 0 0-16 0" />
                  </svg>
                ),
              },
              {
                title: "Search and apply",
                desc: "Filter by role, type, location, or remote. Save and revisit roles anytime.",
                icon: (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <circle cx="11" cy="11" r="6" />
                    <path d="m20 20-3.5-3.5" />
                    <path d="M11 8v6" />
                    <path d="M8 11h6" />
                  </svg>
                ),
              },
              {
                title: "Hire with context",
                desc: "Companies publish roles, review applicants, and save promising candidates by skill.",
                icon: (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                    <rect x="3" y="7" width="18" height="13" rx="2" />
                    <path d="M12 11v3" />
                  </svg>
                ),
              },
            ].map((c) => (
              <div
                key={c.title}
                className={`rounded-2xl border bg-background p-6 shadow-sm ${
                  c.title === "Build your profile" ||
                  c.title === "Search and apply" ||
                  c.title === "Hire with context"
                    ? "border-white"
                    : "border-border"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brandBlue/10 text-brandBlue">
                    {c.icon}
                  </div>
                  <div className="pill-brandBlue">{c.title}</div>
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
          <div className="rounded-3xl border-2 border-foreground bg-background p-8 shadow-sm ring-2 ring-foreground/20">
            <div className="grid items-center gap-8 md:grid-cols-2">
              {/* LEFT: brand block behind heading + copy */}
              <div className="rounded-3xl bg-brand p-8 ring-2 ring-foreground/30">
                <h3 className="flex items-center gap-2 text-xl font-bold text-white">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5 text-white/90"
                  >
                    <path d="M3 7h18" />
                    <path d="M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
                    <rect x="3" y="7" width="18" height="14" rx="2" />
                  </svg>
                  Built for real workflows
                </h3>
                <p className="mt-2 text-white/90">
                  Candidates track applications and get notified when new roles go live.
                  Companies manage listings, review applicants, and keep follow-ups organized.
                </p>

                <div className="mt-6 flex gap-3">
                  <Link href="/register">
                    <Button className="btn-brand border border-white/40 bg-brandBlue text-white hover:opacity-95">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-2 h-4 w-4"
                      >
                        <path d="M12 5v14" />
                        <path d="M5 12h14" />
                      </svg>
                      Get Started
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button className="btn-outline-brand text-white! border-white/40! hover:bg-white/10">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-2 h-4 w-4"
                      >
                        <path d="M10 17l5-5-5-5" />
                        <path d="M15 12H3" />
                        <path d="M21 4v16" />
                      </svg>
                      Log in
                    </Button>
                  </Link>
                </div>
              </div>

              {/* RIGHT: brand cards behind each feature row */}
              <div className="rounded-3xl border-2 border-foreground/30 bg-white/5 p-6">
                <div className="space-y-3">
                  {[
                    {
                      title: "Saved jobs",
                      value: "Quick access to top picks",
                      icon: (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4"
                        >
                          <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z" />
                        </svg>
                      ),
                    },
                    {
                      title: "Notifications",
                      value: "New roles from followed companies",
                      icon: (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4"
                        >
                          <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
                          <path d="M9.5 19a2.5 2.5 0 0 0 5 0" />
                        </svg>
                      ),
                    },
                    {
                      title: "Applicant review",
                      value: "Skill-first candidate lists",
                      icon: (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4"
                        >
                          <circle cx="9" cy="8" r="3" />
                          <path d="M15 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                          <path d="M16 11l2 2 4-4" />
                        </svg>
                      ),
                    },
                    {
                      title: "Company profile",
                      value: "Share mission and hiring focus",
                      icon: (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4"
                        >
                          <path d="M3 21V7a2 2 0 0 1 2-2h6v16" />
                          <path d="M13 9h6a2 2 0 0 1 2 2v10" />
                          <path d="M7 9h2" />
                          <path d="M7 13h2" />
                          <path d="M7 17h2" />
                          <path d="M15 13h2" />
                          <path d="M15 17h2" />
                        </svg>
                      ),
                    },
                  ].map((row) => (
                    <div
                      key={row.title}
                      className="rounded-xl bg-brand p-4 shadow-sm ring-2 ring-foreground/30"
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold text-white">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white/90">
                          {row.icon}
                        </span>
                        <span>{row.title}</span>
                      </div>
                      <p className="text-xs text-white/85">{row.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

        {/* Founders / Backed by */}
        <section className="bg-background">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="flex flex-col gap-10">
              <h3 className="text-center text-2xl font-semibold text-white md:text-3xl">
                Founding Partners
              </h3>

              {/* Center the grid */}
              <div className="mx-auto w-full max-w-5xl">
                <div className="grid grid-cols-2 justify-items-center gap-6 sm:grid-cols-3 md:grid-cols-3">
                  {[
                    { name: "Founder 1", src: "/founders/founder1.png" },
                    { name: "Founder 2", src: "/founders/founder2.png" },
                    { name: "Founder 3", src: "/founders/founder3.png" },
                  ].map((logo) => (
                    <div
                      key={logo.name}
                      className="flex w-full max-w-[320px] items-center justify-center rounded-2xl border border-black/10 bg-white p-6 shadow-sm"
                    >
                      <div className="relative h-20 w-full">
                        <Image
                          src={logo.src}
                          alt={`${logo.name} logo`}
                          fill
                          sizes="320px"
                          className="object-contain"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>





      <Footer />
    </main>
  );
}
