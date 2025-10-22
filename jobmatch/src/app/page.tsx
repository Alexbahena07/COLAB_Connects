// src/app/page.tsx
import Link from "next/link";
import Button from "@/components/ui/Button";
import Header from "@/components/ui/Header";

export default function Home() {
  return (
    <main className="min-h-screen bg-[--surface] text-[--brand]">
      {/* Top bar */}
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[--brand] opacity-95" />
        <div className="relative mx-auto max-w-6xl px-6 py-24 text-white">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <h1 className="text-4xl font-bold leading-tight md:text-5xl font-serif">
                About Us
              </h1>
              <p className="mt-4 text-lg text-[--surface]/90">
                A metrics-first marketplace that matches companies with job
                candidates using verified skills, accomplishments, and
                performance signals—far beyond résumé keywords.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="w-full sm:w-auto">
                  <Button className="w-full btn-brand">I’m a Candidate</Button>
                </Link>
                <Link href="/register?type=company" className="w-full sm:w-auto">
                  <Button className="text-sm rounded-lg bg-white px-4 py-2 font-semibold text-[--brand] hover:opacity-90">
                    I’m Hiring
                  </Button>
                </Link>
              </div>

              <p className="mt-3 text-sm text-[--surface]/80">
                Already have an account?{" "}
                <Link href="/login" className="text-sm font-semibold text-[--brandBlue] hover:underline">
                  Log in
                </Link>
              </p>
            </div>

            {/* Hero mock panel */}
            <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
              <div className="rounded-xl border border-white/20 bg-white/10 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Top Matches</h3>
                  <span className="rounded-md bg-white/15 px-2 py-1 text-xs">
                    Live Metrics
                  </span>
                </div>
                <ul className="mt-4 space-y-3 text-sm">
                  {[
                    { name: "Alex B · Full-stack", score: 92, skills: "TS, React, Node" },
                    { name: "Sam K · Data Eng", score: 88, skills: "Python, SQL, AWS" },
                    { name: "Mia L · Frontend", score: 84, skills: "Next.js, Tailwind" },
                  ].map((c) => (
                    <li
                      key={c.name}
                      className="rounded-lg border border-white/15 bg-white/10 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span>{c.name}</span>
                        <span className="rounded bg-[--surface] px-2 py-0.5 text-xs font-bold text-[--brand]">
                          {c.score}
                        </span>
                      </div>
                      <p className="mt-1 text-white/80">{c.skills}</p>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 h-2 w-full rounded-full bg-white/20">
                  <div className="h-2 w-2/3 rounded-full bg-[--surface]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-bold text-[--brand]">How it works</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            { title: "Show your proof", desc: "Candidates connect LinkedIn and add degrees, certificates, projects, and skills." },
            { title: "Search by skills", desc: "Companies filter by required skills, certs, location, and availability—instantly." },
            { title: "See Match Scores", desc: "Transparent scoring explains why a candidate fits: skills, experience, and signals." },
          ].map((c) => (
            <div key={c.title} className="card">
              <div className="mb-3 inline-block rounded-lg px-2 py-1 text-xs font-semibold bg-[--brandBlue] text-white">
                {c.title}
              </div>
              <p className="text-[--brandBlue]">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Metrics highlight */}
      <section className="py-14 bg-[--surface]">
        <div className="mx-auto max-w-6xl px-6">
          <div className="card-wide">
            <div className="grid items-center gap-8 md:grid-cols-2">
              <div>
                <h3 className="text-xl font-bold text-[--brand]">Live Skills Demand</h3>
                <p className="mt-2 text-[--brandBlue]">
                  Track which skills are rising, which are saturated, and how your profile stacks up.
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

              {/* Tiny bar list mock */}
              <div className="rounded-xl border p-4 border-[--border]">
                {[
                  { skill: "TypeScript", pct: 90, tone: "var(--brand)" },
                  { skill: "React", pct: 82, tone: "var(--brandBlue)" },
                  { skill: "Python", pct: 74, tone: "#7297A6" },
                  { skill: "SQL", pct: 66, tone: "#83748C" },
                ].map((row) => (
                  <div key={row.skill} className="mb-3">
                    <div className="flex items-center justify-between text-sm text-[--brandBlue]">
                      <span>{row.skill}</span>
                      <span>{row.pct}%</span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-[--surface]">
                      <div
                        className="h-2 rounded-full"
                        style={{ width: `${row.pct}%`, backgroundColor: row.tone }}
                      />
                    </div>
                  </div>
                ))}
                <p className="mt-3 text-xs text-[--brandBlue]">* Sample data for illustration</p>
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
              Build a credible skills profile, connect LinkedIn, and see your Match Score rise as you add proof.
            </p>
            <Link href="/register">
              <Button className="mt-4 btn-brand">Create Profile</Button>
            </Link>
          </div>
          <div className="card">
            <h3 className="text-lg font-semibold text-[--brand]">For Companies</h3>
            <p className="mt-2 text-[--brandBlue]">
              Filter by skills and requirements. Save searches, view Match Scores, and focus on the right people.
            </p>
            <Link href="/register?type=company">
              <Button className="mt-4 btn-outline-brand">Start Recruiting</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[--border]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-[--brandBlue] md:flex-row">
          <p>© {new Date().getFullYear()} COLAB connects</p>
          <nav className="flex gap-5">
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            <Link href="/terms" className="hover:underline">Terms</Link>
            <Link href="/contact" className="hover:underline">Contact</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
