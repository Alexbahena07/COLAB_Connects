"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Header from "@/components/ui/Header_with_Icons";
import Footer from "@/components/ui/Footer";

type Job = {
  id: string;
  title: string;
  company: string;
  companyId?: string | null;
  companyImage?: string | null;
  location: string;
  type: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP";
  remote: boolean;
  skills: string[];
  description: string;
  postedAt: string; // ISO
};

const MOCK_JOBS: Job[] = [
  {
    id: "1",
    title: "Frontend Engineer (React/Next.js)",
    company: "Nova Labs",
    location: "Chicago, IL",
    type: "FULL_TIME",
    remote: true,
    skills: ["React", "Next.js", "TypeScript", "Tailwind"],
    description:
      "Build high-quality UI with Next.js and Tailwind. Work with designers and backend engineers to deliver features quickly.",
    postedAt: "2025-09-01",
  },
  {
    id: "2",
    title: "Data Engineer",
    company: "Acme Analytics",
    location: "Remote",
    type: "FULL_TIME",
    remote: true,
    skills: ["Python", "SQL", "Airflow", "AWS"],
    description:
      "Design and maintain data pipelines and warehousing. Collaborate with data science to productionize models.",
    postedAt: "2025-09-05",
  },
  {
    id: "3",
    title: "Software Engineer Intern",
    company: "BrightStart",
    location: "Austin, TX",
    type: "INTERNSHIP",
    remote: false,
    skills: ["JavaScript", "Node.js", "Git"],
    description:
      "Work with a small team to ship features in an agile environment. Great mentorship and learning culture.",
    postedAt: "2025-08-28",
  },
];

const JOB_TYPE_LABEL: Record<Job["type"], string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
};

const JOB_TYPE_VALUES: Job["type"][] = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"];

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [location, setLocation] = useState("");
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadJobs = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/jobs", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to load jobs (${response.status})`);
        }
        const payload = await response.json();
        if (!active) return;

        if (Array.isArray(payload.jobs)) {
          const parsedJobs = payload.jobs
            .map((job: any) => {
              if (!job || typeof job !== "object") return null;

              const {
                id,
                title,
                company,
                companyId,
                location,
                type: rawType,
                remote,
                description,
                postedAt,
                skills,
              } = job;

              if (
                typeof id !== "string" ||
                typeof title !== "string" ||
                typeof company !== "string" ||
                typeof location !== "string" ||
                typeof description !== "string" ||
                typeof rawType !== "string" ||
                !JOB_TYPE_VALUES.includes(rawType as Job["type"])
              ) {
                return null;
              }

              let postedAtIso: string | null = null;
              if (typeof postedAt === "string") {
                postedAtIso = postedAt;
              } else if (postedAt instanceof Date) {
                postedAtIso = postedAt.toISOString();
              } else if (postedAt && typeof postedAt === "object" && "toString" in postedAt) {
                const parsed = new Date(postedAt as string | number | Date);
                if (!Number.isNaN(parsed.valueOf())) {
                  postedAtIso = parsed.toISOString();
                }
              }

              if (!postedAtIso) {
                return null;
              }

              const normalizedSkills = Array.isArray(skills)
                ? skills.filter((skill: unknown): skill is string => typeof skill === "string")
                : [];

              const companyImage =
                typeof (job as { companyImage?: unknown }).companyImage === "string"
                  ? (job as { companyImage: string }).companyImage
                  : null;
              const normalizedCompanyId = typeof companyId === "string" ? companyId : null;

              return {
                id,
                title,
                company,
                companyId: normalizedCompanyId,
                companyImage,
                location,
                type: rawType as Job["type"],
                remote: Boolean(remote),
                description,
                postedAt: postedAtIso,
                skills: normalizedSkills,
              } as Job;
            })
             .filter((job: Job | null): job is Job => job !== null);

          setJobs(parsedJobs);
        } else {
          setJobs([]);
        }
        setLoadError(null);
      } catch (error) {
        console.error("Unable to load jobs from API, falling back to sample roles.", error);
        if (!active) return;
        setLoadError("Live job listings are unavailable right now. Showing sample roles instead.");
        setJobs(MOCK_JOBS);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadJobs();

    return () => {
      active = false;
    };
  }, []);

  const filteredJobs = useMemo(() => {
    const source = showSavedOnly ? jobs.filter((job) => savedJobIds.has(job.id)) : jobs;
    return source.filter((job) => {
      const query = q.toLowerCase().trim();
      const matchesQuery =
        !query ||
        job.title.toLowerCase().includes(query) ||
        job.company.toLowerCase().includes(query) ||
        job.skills.some((skill) => skill.toLowerCase().includes(query));
      const matchesType = !type || job.type === type;
      const matchesRemote = !remoteOnly || job.remote;
      const matchesLocation =
        !location || job.location.toLowerCase().includes(location.toLowerCase());
      return matchesQuery && matchesType && matchesRemote && matchesLocation;
    });
  }, [jobs, q, type, remoteOnly, location, showSavedOnly, savedJobIds]);

  useEffect(() => {
    if (filteredJobs.length === 0) {
      setSelectedJobId(null);
      return;
    }

    if (!selectedJobId || !filteredJobs.some((job) => job.id === selectedJobId)) {
      setSelectedJobId(filteredJobs[0].id);
    }
  }, [filteredJobs, selectedJobId]);

  const selectedJob =
    (selectedJobId ? filteredJobs.find((job) => job.id === selectedJobId) : filteredJobs[0]) ?? null;
  const hasApplied = selectedJob ? appliedJobIds.has(selectedJob.id) : false;

  useEffect(() => {
    setApplyError(null);
    setIsApplying(false);
  }, [selectedJobId]);

  const noJobsAvailable =
    !isLoading &&
    jobs.length === 0 &&
    q.trim() === "" &&
    type === "" &&
    !remoteOnly &&
    location.trim() === "";

  const toggleSaveJob = (jobId: string) => {
    setSavedJobIds((previous) => {
      const next = new Set(previous);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  };

  const isJobSaved = (jobId: string | null | undefined) => {
    if (!jobId) return false;
    return savedJobIds.has(jobId);
  };

  const getCompanyInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");

  const handleApply = async () => {
    if (!selectedJob) return;
    setApplyError(null);
    setIsApplying(true);

    try {
      const response = await fetch(`/api/jobs/${selectedJob.id}/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobTitle: selectedJob.title,
          jobCompany: selectedJob.company,
          jobLocation: selectedJob.location,
          jobType: selectedJob.type,
          jobRemote: selectedJob.remote,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage =
          typeof payload?.error === "string"
            ? payload.error
            : "We couldn't send your profile. Please try again.";
        setApplyError(errorMessage);
        return;
      }

      setAppliedJobIds((previous) => {
        const next = new Set(previous);
        next.add(selectedJob.id);
        return next;
      });
    } catch (error) {
      console.error("Failed to apply to job", error);
      setApplyError("We couldn't reach the application service. Please try again.");
    } finally {
      setIsApplying(false);
    }
  };

  const handleShareJob = async (job: Job) => {
    setShareError(null);
    setShareNotice(null);

    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/dashboard?jobId=${job.id}`
        : `/dashboard?jobId=${job.id}`;
    const title = `${job.title} at ${job.company}`;
    const text = `Check out this role: ${job.title} at ${job.company}`;

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareNotice("Link copied.");
        return;
      }

      setShareError("Sharing isn't supported in this browser.");
    } catch (error) {
      console.error("Share failed", error);
      setShareError("Unable to share this job right now.");
    }
  };

  return (
    <>
      <Header />
      <main className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
        <div className="shrink-0 border-b border-brand/10 bg-brand/5">
          <div className="mx-auto w-full max-w-6xl px-4 py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-brand">Browse job listings</h1>
                <p className="text-sm text-muted">
                  Filter roles by skill, location, type, or remote status and save your top picks.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  className="btn-outline-brand h-10"
                  onClick={() => setShowSavedOnly((prev) => !prev)}
                >
                  {showSavedOnly ? "Show all" : "Show saved"}
                </Button>
                <Button
                  className="btn-outline-brand h-10"
                  onClick={() => {
                    setQ("");
                    setType("");
                    setRemoteOnly(false);
                    setLocation("");
                    setShowSavedOnly(false);
                  }}
                >
                  Reset filters
                </Button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Search"
                placeholder="Search job title, company, or skill..."
                value={q}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
                className="h-11 border-border bg-background text-foreground placeholder:text-muted"
              />

              <div className="flex flex-col gap-2">
                <label htmlFor="job-type-filter" className="text-sm font-medium text-foreground">
                  Job type
                </label>
                <select
                  id="job-type-filter"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-brand"
                >
                  <option value="">All types</option>
                  <option value="FULL_TIME">Full-time</option>
                  <option value="PART_TIME">Part-time</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="INTERNSHIP">Internship</option>
                </select>
              </div>

              <Input
                label="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, state, or remote"
                className="h-11 border-border bg-background text-foreground placeholder:text-muted"
              />

              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-foreground">Remote</span>
                <label
                  htmlFor="remote-only-toggle"
                  className="flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                >
                  <input
                    id="remote-only-toggle"
                    type="checkbox"
                    checked={remoteOnly}
                    onChange={(e) => setRemoteOnly(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Remote only
                </label>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">
                {isLoading
                  ? "Loading jobs..."
                  : `${filteredJobs.length} job${filteredJobs.length === 1 ? "" : "s"} found`}
              </p>
            </div>

            {loadError ? (
              <div className="mt-3 rounded-lg border border-yellow-400 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
                {loadError}
              </div>
            ) : null}
          </div>
        </div>

      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden p-4 md:flex-row">
        <aside
          className="flex min-h-0 w-full flex-col overflow-hidden rounded-2xl bg-brandBlue md:w-96 md:max-w-sm md:shrink-0"
          aria-label="Job list"
        >
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ul className="divide-y divide-white/10">
              {isLoading ? (
                <li className="p-4 text-sm text-white/70">Loading jobs...</li>
              ) : filteredJobs.length === 0 ? (
                <li className="p-4 text-sm text-white/70">
                  {showSavedOnly
                    ? "You haven't saved any jobs yet."
                    : noJobsAvailable
                    ? "No job listings are available yet."
                    : "No results. Try adjusting filters."}
                </li>
              ) : (
                filteredJobs.map((job) => {
                  const active = job.id === selectedJob?.id;
                  return (
                    <li key={job.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedJobId(job.id)}
                        className={`group w-full p-4 text-left transition ${
                          active
                            ? "border-l-4 border-l-white bg-white/20"
                            : "border-l-4 border-l-transparent hover:border-l-white hover:bg-brand"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border text-xs font-semibold transition ${
                              active
                                ? "border-white/60 bg-white/25 text-white"
                                : "border-white/30 bg-white/15 text-white group-hover:border-white/60 group-hover:bg-white/25"
                            }`}>
                              {job.companyImage ? (
                                <img
                                  src={job.companyImage}
                                  alt={`${job.company} logo`}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                getCompanyInitials(job.company)
                              )}
                            </div>
                            <div>
                              <h3 className={`font-semibold text-white transition ${active ? "opacity-100" : "opacity-90 group-hover:opacity-100"}`}>{job.title}</h3>
                              <p className="mt-1 text-sm text-white/65 transition group-hover:text-white/80">
                                {job.company} · {job.location}
                              </p>
                            </div>
                          </div>
                          <span className="rounded-md bg-white/20 px-2 py-0.5 text-xs font-medium text-white">
                            {JOB_TYPE_LABEL[job.type]}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-white/55 transition group-hover:text-white/70">
                          {new Date(job.postedAt).toLocaleDateString()}
                        </p>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </aside>

        <section className="min-h-0 flex-1 overflow-y-auto rounded-2xl bg-brand p-6">
          {!selectedJob ? (
            <div className="card">Select a job to view details.</div>
          ) : (
            <article className="card-wide flex h-full flex-col gap-6 border-t-4 border-t-brand">
              <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-brandBlue/40 bg-brandBlue/10 text-sm font-semibold text-brandBlue">
                    {selectedJob.companyImage ? (
                      <img
                        src={selectedJob.companyImage}
                        alt={`${selectedJob.company} logo`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getCompanyInitials(selectedJob.company)
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-foreground">{selectedJob.title}</h2>
                    <p className="text-muted">
                      {selectedJob.company} · {selectedJob.location}
                      {selectedJob.remote ? " · Remote" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-brand/10 px-2 py-1 text-xs font-medium text-brand">
                    {JOB_TYPE_LABEL[selectedJob.type]}
                  </span>
                  <span className="rounded-md bg-surface px-2 py-1 text-xs text-muted border border-border">
                    Posted {new Date(selectedJob.postedAt).toLocaleDateString()}
                  </span>
                </div>
              </header>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-brand">Key skills</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedJob.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-xl px-3 py-1 text-xs"
                      style={{ backgroundColor: "var(--brandBlue)", color: "#fff" }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-brand">About this role</h3>
                <p className="leading-relaxed">{selectedJob.description}</p>
              </section>

              <div className="mt-auto flex flex-wrap items-center gap-3">
                <Button
                  className="btn-brand h-10"
                  onClick={handleApply}
                  isLoading={isApplying}
                  disabled={!selectedJob || hasApplied}
                >
                  {hasApplied ? "Applied" : "Apply"}
                </Button>
                {selectedJob.companyId ? (
                  <Link href={`/companies/${selectedJob.companyId}`}>
                    <Button className="btn-outline-brand h-10">
                      View company profile
                    </Button>
                  </Link>
                ) : null}
                <Button
                  className={
                    isJobSaved(selectedJob.id)
                      ? "btn-brand h-10 w-10 p-0 bg-white text-brand"
                      : "btn-outline-brand h-10 w-10 p-0"
                  }
                  onClick={() => toggleSaveJob(selectedJob.id)}
                  aria-label={isJobSaved(selectedJob.id) ? "Unsave job" : "Save job"}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-7 w-7 scale-[2.5]"
                    aria-hidden="true"
                  >
                    <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z" />
                  </svg>
                </Button>
                <Button
                  className="btn-outline-brand h-10 w-10 p-0"
                  aria-label="Share job"
                  onClick={() => handleShareJob(selectedJob)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-7 w-7 scale-[2.5]"
                    aria-hidden="true"
                  >
                    <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
                    <path d="M12 16V4" />
                    <path d="m8 8 4-4 4 4" />
                  </svg>
                </Button>
                {shareNotice ? (
                  <span className="text-xs text-muted">{shareNotice}</span>
                ) : null}
                {shareError ? <span className="text-xs text-red-400">{shareError}</span> : null}
                {applyError ? <span className="text-xs text-red-400">{applyError}</span> : null}
              </div>
            </article>
          )}
        </section>
      </div>
      </main>
    </>
  );
}
