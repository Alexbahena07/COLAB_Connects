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
  const [applySuccess, setApplySuccess] = useState<string | null>(null);

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

              return {
                id,
                title,
                company,
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
    setApplySuccess(null);
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

  const handleApply = async () => {
    if (!selectedJob) return;
    setApplyError(null);
    setApplySuccess(null);
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

      const message =
        typeof payload?.message === "string"
          ? payload.message
          : `Your profile was sent to ${selectedJob.company}.`;
      setApplySuccess(message);
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

  return (
    <>
      <Header />
      <main className="flex min-h-screen flex-col bg-[--background] text-[--foreground]">
      <div className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto w-full max-w-6xl px-4 py-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[220px] flex-1">
              <Input
                label="Search"
                placeholder="Search job title, company, or skill..."
                value={q}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
                className="h-11"
                labelClassName="text-white"
              />
            </div>

            <div className="flex min-w-[180px] flex-col gap-2">
              <label htmlFor="job-type-filter" className="text-sm font-medium text-white">
                Job type
              </label>
              <select
                id="job-type-filter"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="h-11 rounded-xl border border-white bg-[--surface] px-3 text-sm text-white"
              >
                <option className="text-black" value="">
                  All types
                </option>
                <option className="text-black" value="FULL_TIME">
                  Full-time
                </option>
                <option className="text-black" value="PART_TIME">
                  Part-time
                </option>
                <option className="text-black" value="CONTRACT">
                  Contract
                </option>
                <option className="text-black" value="INTERNSHIP">
                  Internship
                </option>
              </select>
            </div>

            <div className="flex min-w-[180px] flex-col gap-2 text-white">
              <label htmlFor="job-location-filter" className="text-sm font-medium text-white">
                Location
              </label>
              <input
                id="job-location-filter"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Location"
                className="h-11 rounded-xl border border-[--border] bg-[--surface] px-3 text-sm text-[--foreground]"
              />
            </div>

            <div className="flex min-w-[160px] flex-col gap-2 text-white">
              <span className="text-sm font-medium text-white">Remote</span>
              <label
                htmlFor="remote-only-toggle"
                className="flex h-11 items-center gap-2 rounded-xl border border-[--border] bg-[--surface] px-3 text-sm text-white"
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

            <div className="flex flex-col gap-2 md:ml-auto">
              <span className="text-sm font-medium text-white opacity-0">Actions</span>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  className={`h-11 rounded-xl border px-4 text-sm font-semibold transition ${
                    showSavedOnly
                      ? "border-white bg-white/10 text-white"
                      : "border-white text-white hover:bg-white/10"
                  }`}
                  onClick={() => setShowSavedOnly((prev) => !prev)}
                >
                  {showSavedOnly ? "All jobs" : "View saved jobs"}
                </Button>
                <Button
                  className="btn-outline-brand h-11"
                  onClick={() => {
                    setQ("");
                    setType("");
                    setRemoteOnly(false);
                    setLocation("");
                    setShowSavedOnly(false);
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>
          </div>
          {loadError ? (
            <div className="mt-3 rounded-lg border border-yellow-400 bg-yellow-400/10 px-3 py-2 text-xs text-yellow-100">
              {loadError}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-hidden md:flex-row">
        <aside
          className="w-full border-b md:w-80 md:max-w-xs md:flex-shrink-0 md:border-b-0 md:border-r"
          style={{ borderColor: "var(--border)" }}
          aria-label="Job list"
        >
          <div className="h-full overflow-y-auto">
            <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
              {isLoading ? (
                <li className="p-4 text-sm opacity-80">Loading jobs...</li>
              ) : filteredJobs.length === 0 ? (
                <li className="p-4 text-sm opacity-80">
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
                        className={`w-full p-4 text-left transition ${
                          active ? "bg-[--surface] shadow-sm" : "hover:bg-[--surface]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h3 className="font-semibold">{job.title}</h3>
                            <p className="mt-1 text-sm opacity-90">
                              {job.company} - {job.location}
                            </p>
                          </div>
                          <span
                            className="rounded-md border px-2 py-0.5 text-xs"
                            style={{ borderColor: "var(--border)" }}
                          >
                            {JOB_TYPE_LABEL[job.type]}
                          </span>
                        </div>
                        <p className="mt-2 text-xs opacity-80">
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

        <section className="flex-1 overflow-y-auto p-6">
          {!selectedJob ? (
            <div className="card">Select a job to view details.</div>
          ) : (
            <article className="card-wide flex h-full flex-col gap-6">
              <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">{selectedJob.title}</h2>
                  <p className="opacity-90">
                    {selectedJob.company} - {selectedJob.location}
                    {selectedJob.remote ? " | Remote" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-md border px-2 py-1 text-xs"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {JOB_TYPE_LABEL[selectedJob.type]}
                  </span>
                  <span
                    className="rounded-md border px-2 py-1 text-xs"
                    style={{ borderColor: "var(--border)" }}
                  >
                    Posted {new Date(selectedJob.postedAt).toLocaleDateString()}
                  </span>
                </div>
              </header>

              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide opacity-80">Key skills</h3>
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
                <h3 className="text-sm font-semibold uppercase tracking-wide opacity-80">About this role</h3>
                <p className="leading-relaxed">{selectedJob.description}</p>
              </section>

              <div className="mt-auto flex flex-wrap gap-3">
                <Button
                  className="btn-brand"
                  onClick={handleApply}
                  isLoading={isApplying}
                  disabled={!selectedJob || hasApplied}
                >
                  {hasApplied ? "Applied" : "Apply"}
                </Button>
                <Button
                  className={isJobSaved(selectedJob.id) ? "btn-brand bg-white text-[--brand]" : "btn-outline-brand"}
                  onClick={() => toggleSaveJob(selectedJob.id)}
                >
                  {isJobSaved(selectedJob.id) ? "Unsave" : "Save"}
                </Button>
                <Button className="btn-outline-brand">Share</Button>
              </div>

              {applyError ? (
                <p className="text-sm text-red-500">{applyError}</p>
              ) : null}
              {applySuccess ? (
                <p className="text-sm text-green-500">{applySuccess}</p>
              ) : null}
            </article>
          )}
        </section>
      </div>
      <Footer />
      </main>
    </>
  );
}
