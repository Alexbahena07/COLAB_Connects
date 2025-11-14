"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Header from "@/components/ui/Header";

type Applicant = {
  id: string;
  name: string;
  school: string;
  major: string;
  graduationYear: string;
  location: string;
  email: string;
  phone: string;
  skills: string[];
  summary: string;
  experience: Array<{
    role: string;
    company: string;
    duration: string;
    highlights: string[];
  }>;
  projects: Array<{
    name: string;
    description: string;
    skills: string[];
  }>;
  submittedAt: string; // ISO
};

const SKILL_OPTIONS = ["React", "TypeScript", "Python", "Data Science", "Figma", "SQL", "Node.js", "UX Research", "Motion", "Firebase", "After Effects", "R", "scikit-learn"];
const MAJOR_OPTIONS = ["Computer Science", "Information Systems", "Design", "Business Analytics"];
const GRAD_YEARS = ["2025", "2026", "2027"];

const MOCK_APPLICANTS: Applicant[] = [
  {
    id: "a-1",
    name: "Maya Chen",
    school: "Stanford University",
    major: "Computer Science",
    graduationYear: "2025",
    location: "San Francisco, CA",
    email: "maya.chen@email.com",
    phone: "(415) 555-2180",
    skills: ["React", "TypeScript", "Node.js"],
    summary:
      "Frontend-focused engineer with 2 internships building accessible, component-driven web applications. Passionate about design systems and rapid iteration.",
    experience: [
      {
        role: "Frontend Engineering Intern",
        company: "BrightOps",
        duration: "Jun 2024 - Aug 2024",
        highlights: ["Led redesign of dashboard widgets", "Improved Lighthouse performance score from 68 to 92"],
      },
      {
        role: "Software Engineering Intern",
        company: "River Tech",
        duration: "Jun 2023 - Aug 2023",
        highlights: ["Built real-time analytics view in Next.js", "Collaborated with product on accessibility QA"]
      }
    ],
    projects: [
      {
        name: "Campus Tasks",
        description: "Student productivity web app with shared calendars and real-time updates.",
        skills: ["React", "TypeScript", "Firebase"],
      },
    ],
    submittedAt: "2025-09-08",
  },
  {
    id: "a-2",
    name: "Jordan Alvarez",
    school: "University of Michigan",
    major: "Information Systems",
    graduationYear: "2026",
    location: "Ann Arbor, MI",
    email: "jordana@umich.edu",
    phone: "(734) 555-9971",
    skills: ["SQL", "Python", "Data Science"],
    summary:
      "Data-driven problem solver with experience building ETL jobs and dashboards that inform product decisions.",
    experience: [
      {
        role: "Data Analyst Intern",
        company: "Insightful",
        duration: "May 2024 - Aug 2024",
        highlights: ["Automated weekly reporting for 15+ stakeholders", "Built churn propensity model with 82% accuracy"],
      }
    ],
    projects: [
      {
        name: "Trail Metrics",
        description: "Analyzed national park trail usage and created interactive Tableau dashboards for visitors.",
        skills: ["Python", "SQL", "Tableau"],
      },
    ],
    submittedAt: "2025-09-05",
  },
  {
    id: "a-3",
    name: "Priya Desai",
    school: "Rhode Island School of Design",
    major: "Design",
    graduationYear: "2025",
    location: "Providence, RI",
    email: "priya.designs@risd.edu",
    phone: "(401) 555-7712",
    skills: ["Figma", "UX Research", "Motion"],
    summary:
      "Product designer focused on storytelling and motion systems. Loves prototyping complex interactions and collaborating with engineers.",
    experience: [
      {
        role: "Product Design Intern",
        company: "Glyph Studio",
        duration: "Jun 2024 - Aug 2024",
        highlights: ["Created motion guidelines for design system", "Ran user research studies with ~30 participants"],
      }
    ],
    projects: [
      {
        name: "Transit Muse",
        description: "Concept redesign of public transit mobile experience focused on accessibility and ease of use.",
        skills: ["Figma", "After Effects"],
      }
    ],
    submittedAt: "2025-09-02",
  },
  {
    id: "a-4",
    name: "Ethan Patel",
    school: "Georgia Tech",
    major: "Business Analytics",
    graduationYear: "2026",
    location: "Atlanta, GA",
    email: "ethan.patel@gatech.edu",
    phone: "(404) 555-6432",
    skills: ["Python", "SQL", "R"],
    summary:
      "Analytics student with co-op experience building predictive KPIs for finance teams. Comfortable presenting insights to senior stakeholders.",
    experience: [
      {
        role: "Business Analytics Co-op",
        company: "AeroLink",
        duration: "Jan 2024 - Aug 2024",
        highlights: ["Implemented demand forecasting model", "Collaborated with engineering to productionize dashboards"],
      }
    ],
    projects: [
      {
        name: "GreenGrid",
        description: "Optimized energy usage patterns for small businesses using public datasets and clustering.",
        skills: ["Python", "scikit-learn"],
      }
    ],
    submittedAt: "2025-09-10",
  },
];

export default function CompanyDashboardPage() {
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(MOCK_APPLICANTS[0]?.id ?? null);
  const [q, setQ] = useState("");
  const [major, setMajor] = useState("");
  const [skill, setSkill] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [isMessageComposerOpen, setIsMessageComposerOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState("");
  const [messageSuccess, setMessageSuccess] = useState<string | null>(null);

  const applicants = useMemo(() => {
    const query = q.trim().toLowerCase();
    return MOCK_APPLICANTS.filter((a) => {
      const matchesQuery =
        !query ||
        a.name.toLowerCase().includes(query) ||
        a.school.toLowerCase().includes(query) ||
        a.summary.toLowerCase().includes(query) ||
        a.skills.some((s) => s.toLowerCase().includes(query));

      const matchesMajor = !major || a.major === major;
      const matchesSkill = !skill || a.skills.includes(skill);
      const matchesGradYear = !gradYear || a.graduationYear === gradYear;
      return matchesQuery && matchesMajor && matchesSkill && matchesGradYear;
    });
  }, [q, major, skill, gradYear]);

  useEffect(() => {
    if (applicants.length === 0) {
      setSelectedApplicantId(null);
      return;
    }
    if (!selectedApplicantId || !applicants.some((c) => c.id === selectedApplicantId)) {
      setSelectedApplicantId(applicants[0].id);
    }
  }, [applicants, selectedApplicantId]);

  const selectedApplicant =
    (selectedApplicantId ? applicants.find((c) => c.id === selectedApplicantId) : applicants[0]) ?? null;

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => setQ(e.target.value);

  const handleSendMessage = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedApplicant) return;
    if (!messageText.trim()) {
      setMessageError("Write a quick note before sending.");
      setMessageSuccess(null);
      return;
    }

    setMessageError("");
    setIsSendingMessage(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicantId: selectedApplicant.id,
          applicantEmail: selectedApplicant.email,
          applicantName: selectedApplicant.name,
          message: messageText.trim(),
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        const msg = typeof payload?.error === "string" ? payload.error : "We couldn't send that message. Please try again.";
        setMessageError(msg);
        setMessageSuccess(null);
        return;
      }

      const ok = await res.json().catch(() => ({}));
      const okMsg = typeof ok?.message === "string" ? ok.message : "Message sent! Check the messages tab for the conversation.";
      setMessageSuccess(okMsg);
      setMessageText("");
    } catch (err) {
      console.error("Failed to send message", err);
      setMessageError("We couldn't reach the messaging service. Please try again.");
      setMessageSuccess(null);
    } finally {
      setIsSendingMessage(false);
    }
  };

  useEffect(() => {
    setIsMessageComposerOpen(false);
    setMessageText("");
    setMessageError("");
    setMessageSuccess(null);
  }, [selectedApplicantId]);

  return (
    <>
      <Header />
      <main className="flex min-h-screen flex-col bg-[--background] text-[--foreground]">
      {/* Filters */}
      <div className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto w-full max-w-6xl px-4 py-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[220px] flex-1">
              <Input
                label="Search"
                placeholder="Search name, school, or skill..."
                value={q}
                onChange={handleSearchChange}
                className="h-11"
                labelClassName="text-white"
              />
            </div>

            <div className="flex min-w-[160px] flex-col gap-2">
              <label htmlFor="filter-major" className="text-sm font-medium text-white">
                Major
              </label>
              <select
                id="filter-major"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                className="h-11 rounded-xl border border-[--border] bg-[--surface] px-3 text-sm text-[--foreground]"
              >
                <option value="">All majors</option>
                {MAJOR_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex min-w-[160px] flex-col gap-2">
              <label htmlFor="filter-skill" className="text-sm font-medium text-white">
                Skill focus
              </label>
              <select
                id="filter-skill"
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
                className="h-11 rounded-xl border border-[--border] bg-[--surface] px-3 text-sm text-[--foreground]"
              >
                <option value="">All skills</option>
                {SKILL_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex min-w-[140px] flex-col gap-2">
              <label htmlFor="filter-grad-year" className="text-sm font-medium text-white">
                Grad year
              </label>
              <select
                id="filter-grad-year"
                value={gradYear}
                onChange={(e) => setGradYear(e.target.value)}
                className="h-11 rounded-xl border border-[--border] bg-[--surface] px-3 text-sm text-[--foreground]"
              >
                <option value="">All years</option>
                {GRAD_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2 md:ml-auto">
              <span className="text-sm font-medium text-transparent">Actions</span>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/dashboard/company/jobs"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-white px-4 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Manage jobs
                </Link>
                <Link
                  href="/dashboard/company/profile"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-white px-4 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Company info
                </Link>
                <Link
                  href="/dashboard/company/messages"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-white px-4 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  View messages
                </Link>
                <Button
                  className="btn-outline-brand h-11"
                  onClick={() => {
                    setQ("");
                    setMajor("");
                    setSkill("");
                    setGradYear("");
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* ✅ removed the extra closing </div> that was here */}

      {/* Split view */}
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-hidden md:flex-row">
        <aside
          className="w-full border-b md:w-96 md:max-w-sm md:flex-shrink-0 md:border-b-0 md:border-r"
          style={{ borderColor: "var(--border)" }}
          aria-label="Applicant list"
        >
          <div className="h-full overflow-y-auto">
            <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
              {applicants.length === 0 ? (
                <li className="p-4 text-sm opacity-80">No applicants match your filters.</li>
              ) : (
                applicants.map((candidate) => {
                  const active = candidate.id === selectedApplicant?.id;
                  return (
                    <li key={candidate.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedApplicantId(candidate.id)}
                        className={`w-full p-4 text-left transition ${active ? "bg-[--surface] ring-1 ring-[--brandBlue]" : "hover:bg-[--surface]"}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h3 className="font-semibold">{candidate.name}</h3>
                            <p className="mt-1 text-sm opacity-90">
                              {candidate.major} · {candidate.school}
                            </p>
                          </div>
                          <span className="rounded-md border px-2 py-0.5 text-xs" style={{ borderColor: "var(--border)" }}>
                            {candidate.graduationYear}
                          </span>
                        </div>
                        <p className="mt-2 text-xs opacity-80">
                          Applied {new Date(candidate.submittedAt).toLocaleDateString()}
                        </p>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </aside>

        <section className="flex-1 overflow-y-auto p-6">
          {!selectedApplicant ? (
            <div className="card">Select an applicant to view their profile.</div>
          ) : (
            <article className="card-wide flex h-full flex-col gap-6">
              <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">{selectedApplicant.name}</h2>
                  <p className="opacity-90">
                    {selectedApplicant.major} · {selectedApplicant.school}
                  </p>
                  <p className="text-sm opacity-80">
                    {selectedApplicant.location} · Grad {selectedApplicant.graduationYear}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm opacity-90">
                  <span>{selectedApplicant.email}</span>
                  <span>{selectedApplicant.phone}</span>
                </div>
              </header>

              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide opacity-80">Top skills</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedApplicant.skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-xl px-3 py-1 text-xs"
                      style={{ backgroundColor: "var(--brandBlue)", color: "#fff" }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide opacity-80">Summary</h3>
                <p className="leading-relaxed">{selectedApplicant.summary}</p>
              </section>

              <section className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide opacity-80">Experience</h3>
                {selectedApplicant.experience.map((item, idx) => (
                  <div key={`${item.company}-${idx}`} className="rounded-xl border border-[--border] bg-[--surface] p-4">
                    <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold">{item.role}</p>
                        <p className="text-sm opacity-80">{item.company}</p>
                      </div>
                      <p className="text-xs opacity-70">{item.duration}</p>
                    </div>
                    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm opacity-90">
                      {item.highlights.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>

              <section className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide opacity-80">Projects</h3>
                {selectedApplicant.projects.map((p) => (
                  <div key={p.name} className="rounded-xl border border-[--border] bg-[--surface] p-4">
                    <p className="font-semibold">{p.name}</p>
                    <p className="mt-1 text-sm opacity-90">{p.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {p.skills.map((ps) => (
                        <span key={ps} className="rounded-xl border border-[--border] px-3 py-1 text-xs opacity-80">
                          {ps}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </section>

              <div className="mt-auto flex flex-wrap gap-3">
                <Button className="btn-brand">Request interview</Button>
                <Button
                  type="button"
                  className="btn-outline-brand h-11"
                  disabled={!selectedApplicant}
                  onClick={() => {
                    setIsMessageComposerOpen((prev) => !prev);
                    setMessageError("");
                    setMessageSuccess(null);
                  }}
                >
                  {isMessageComposerOpen ? "Close message" : "Send message"}
                </Button>
                <Button className="btn-outline-brand">View resume</Button>
              </div>

              {isMessageComposerOpen && selectedApplicant ? (
                <form
                  className="mt-4 space-y-3 rounded-xl border border-[--border] bg-[--surface] p-4"
                  onSubmit={handleSendMessage}
                >
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-[--foreground]">
                      Message to {selectedApplicant.name}
                    </label>
                    <textarea
                      value={messageText}
                      onChange={(e) => {
                        setMessageText(e.target.value);
                        if (messageError) setMessageError("");
                        if (messageSuccess) setMessageSuccess(null);
                      }}
                      className="min-h-[120px] w-full rounded-xl border border-[--border] bg-[--background] px-3 py-2 text-sm text-[--foreground] outline-none transition focus:border-[--brandBlue] focus:ring-2 focus:ring-[--brandBlue] focus:ring-opacity-30"
                      placeholder="Introduce yourself, mention why you're reaching out, and share next steps..."
                    />
                  </div>
                  {messageError ? <p className="text-sm text-red-500">{messageError}</p> : null}
                  {messageSuccess ? <p className="text-sm text-green-500">{messageSuccess}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" className="btn-brand" isLoading={isSendingMessage}>
                      Send
                    </Button>
                    <Button
                      type="button"
                      className="btn-outline-brand"
                      onClick={() => {
                        setIsMessageComposerOpen(false);
                        setMessageText("");
                        setMessageError("");
                        setMessageSuccess(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : null}
            </article>
          )}
        </section>
      </div>
      </main>
    </>
  );
}
