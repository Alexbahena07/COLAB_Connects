"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Header from "@/components/ui/Header_with_Icons";
import Footer from "@/components/ui/Footer";

type Job = {
  id: string;
  title: string;
  companyId: string;
  company: string;
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
    companyId: "company-1",
    company: "Nova Labs",
    companyImage: null,
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
    companyId: "company-2",
    company: "Acme Analytics",
    companyImage: null,
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
    companyId: "company-3",
    company: "BrightStart",
    companyImage: null,
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

const getCompanyInitials = (company: string) => {
  const trimmed = company.trim();
  if (!trimmed) return "CO";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

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
  const [isFollowingCompany, setIsFollowingCompany] = useState(false);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);
  const [followError, setFollowError] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
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
          const parsedJobs: Job[] = payload.jobs
            .map((job: unknown): Job | null => {
              if (!job || typeof job !== "object") return null;

              const raw = job as Record<string, unknown>;

              const id = typeof raw.id === "string" ? raw.id : null;
              const title = typeof raw.title === "string" ? raw.title : null;
              const companyId = typeof raw.companyId === "string" ? raw.companyId : null;
              const company = typeof raw.company === "string" ? raw.company : null;
              const companyImage =
                typeof raw.companyImage === "string" ? raw.companyImage : null;
              const jobLocation = typeof raw.location === "string" ? raw.location : null;
              const description =
                typeof raw.description === "string" ? raw.description : null;
              const rawType =
                typeof raw.type === "string" ? (raw.type as string) : null;

              if (
                !id ||
                !title ||
                !companyId ||
                !company ||
                !jobLocation ||
                !description ||
                !rawType ||
                !JOB_TYPE_VALUES.includes(rawType as Job["type"])
              ) {
                return null;
              }

              const postedAtValue = raw.postedAt;
              let postedAtIso: string | null = null;

              if (typeof postedAtValue === "string") {
                postedAtIso = postedAtValue;
              } else if (postedAtValue instanceof Date) {
                postedAtIso = postedAtValue.toISOString();
              } else if (postedAtValue && typeof postedAtValue === "object") {
                const maybeString =
                  "toString" in postedAtValue
                    ? (postedAtValue as { toString: () => string }).toString()
                    : "";
                const parsedDate = new Date(maybeString);
                if (!Number.isNaN(parsedDate.valueOf())) {
                  postedAtIso = parsedDate.toISOString();
                }
              }

              if (!postedAtIso) {
                return null;
              }

              const skillsValue = raw.skills;
              const normalizedSkills = Array.isArray(skillsValue)
                ? skillsValue.filter((skill): skill is string => typeof skill === "string")
                : [];

              return {
                id,
                title,
                companyId,
                company,
                companyImage,
                location: jobLocation,
                type: rawType as Job["type"],
                remote: Boolean(raw.remote),
                description,
                postedAt: postedAtIso,
                skills: normalizedSkills,
              };
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
    const source = showSavedOnly
      ? jobs.filter((job: Job) => savedJobIds.has(job.id))
      : jobs;

    return source.filter((job: Job) => {
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

    if (!selectedJobId || !filteredJobs.some((job: Job) => job.id === selectedJobId)) {
      setSelectedJobId(filteredJobs[0].id);
    }
  }, [filteredJobs, selectedJobId]);

  const selectedJob =
    (selectedJobId
      ? filteredJobs.find((job: Job) => job.id === selectedJobId)
      : filteredJobs[0]) ?? null;

  const selectedCompanyId = selectedJob?.companyId ?? null;

  const hasApplied = selectedJob ? appliedJobIds.has(selectedJob.id) : false;

  useEffect(() => {
    setApplyError(null);
    setApplySuccess(null);
    setIsApplying(false);
    setFollowError(null);
    setShareMessage(null);
    setShareError(null);
  }, [selectedJob?.companyId]);

  useEffect(() => {
    let active = true;
    const loadFollowStatus = async () => {
      if (!selectedCompanyId) {
        setIsFollowingCompany(false);
        return;
      }
      setIsLoadingFollow(true);
      try {
        const response = await fetch(`/api/companies/${selectedCompanyId}/follow`, {
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null);
        if (!active) return;

        if (!response.ok) {
          const errorMessage =
            typeof payload?.error === "string"
              ? payload.error
              : "We couldn't load follow status.";
          setFollowError(errorMessage);
          setIsFollowingCompany(false);
          return;
        }

        setIsFollowingCompany(Boolean(payload?.isFollowing));
      } catch (error) {
        console.error("Failed to load follow status", error);
        if (!active) return;
        setFollowError("We couldn't load follow status.");
        setIsFollowingCompany(false);
      } finally {
        if (active) {
          setIsLoadingFollow(false);
        }
      }
    };

    loadFollowStatus();
    return () => {
      active = false;
    };
  }, [selectedCompanyId]);

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

  const toggleFollowCompany = async () => {
    if (!selectedJob?.companyId) return;
    setFollowError(null);
    setIsLoadingFollow(true);

    try {
      const response = await fetch(`/api/companies/${selectedJob.companyId}/follow`, {
        method: isFollowingCompany ? "DELETE" : "POST",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage =
          typeof payload?.error === "string"
            ? payload.error
            : "We couldn't update the follow status.";
        setFollowError(errorMessage);
        return;
      }

      setIsFollowingCompany(Boolean(payload?.followed));
    } catch (error) {
      console.error("Failed to update follow status", error);
      setFollowError("We couldn't update the follow status.");
    } finally {
      setIsLoadingFollow(false);
    }
  };

  const handleShare = async () => {
    if (!selectedJob) return;
    setShareMessage(null);
    setShareError(null);

    const origin =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "";
    const shareUrl = `${origin}/dashboard?jobId=${selectedJob.id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: selectedJob.title,
          text: `${selectedJob.company} is hiring for ${selectedJob.title}.`,
          url: shareUrl,
        });
        setShareMessage("Share sheet opened.");
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setShareMessage("Job link copied to clipboard.");
        return;
      }

      setShareError("Sharing is not supported on this device.");
    } catch (error) {
      console.error("Failed to share job", error);
      setShareError("We couldn't share this job. Try copying the link.");
    }
  };

  return (
    <>
      <Header />
      <main className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
        <div className="border-b" style={{ borderColor: "var(--border)" }}>
          <div className="mx-auto w-full max-w-6xl px-4 py-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-[220px] flex-1">
                <Input
                  label="Search"
                  placeholder="Search job title, company, or skill..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
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
                  className="h-11 rounded-xl border border-white bg-[var(--surface)] px-3 text-sm text-white"
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
                  className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]"
                />
              </div>

              <div className="flex min-w-[160px] flex-col gap-2 text-white">
                <span className="text-sm font-medium text-white">Remote</span>
                <label
                  htmlFor="remote-only-toggle"
                  className="flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-white"
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
                  filteredJobs.map((job: Job) => {
                    const active = job.id === selectedJob?.id;
                    const initials = getCompanyInitials(job.company);
                    return (
                      <li key={job.id} className="p-4">
                        <button
                          type="button"
                          onClick={() => setSelectedJobId(job.id)}
                          className={`w-full rounded-xl p-3 text-left transition ${
                            active ? "bg-[var(--surface)] shadow-sm" : "hover:bg-[var(--surface)]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/5 text-xs font-semibold uppercase text-white/70">
                                {job.companyImage ? (
                                  <Image
                                    src={job.companyImage}
                                    alt={`${job.company} logo`}
                                    width={40}
                                    height={40}
                                    className="h-10 w-10 object-cover"
                                    unoptimized
                                  />
                                ) : (
                                  <span>{initials}</span>
                                )}
                              </div>
                              <div>
                                <h3 className="font-semibold">{job.title}</h3>
                                <p className="mt-1 text-sm opacity-90">
                                  {job.company} - {job.location}
                                </p>
                              </div>
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
                        <Link
                          href={`/companies/${job.companyId}`}
                          className="mt-2 inline-flex text-xs font-semibold text-[var(--brandBlue)] underline underline-offset-2"
                        >
                          View company profile
                        </Link>
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
                    <Link
                      href={`/companies/${selectedJob.companyId}`}
                      className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brandBlue)] underline underline-offset-2"
                    >
                      <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-[var(--brandBlue)]/40 bg-[var(--brandBlue)]/10 text-[11px] font-semibold uppercase text-[var(--brandBlue)]">
                        {selectedJob.companyImage ? (
                          <Image
                            src={selectedJob.companyImage}
                            alt={`${selectedJob.company} logo`}
                            width={24}
                            height={24}
                            className="h-6 w-6 object-cover"
                            unoptimized
                          />
                        ) : (
                          <span>{getCompanyInitials(selectedJob.company)}</span>
                        )}
                      </span>
                      <span>View company profile</span>
                    </Link>
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
                  <h3 className="text-sm font-semibold uppercase tracking-wide opacity-80">
                    Key skills
                  </h3>
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
                  <h3 className="text-sm font-semibold uppercase tracking-wide opacity-80">
                    About this role
                  </h3>
                  <p className="leading-relaxed">{selectedJob.description}</p>
                </section>

                <div className="mt-auto flex flex-wrap items-end justify-between gap-3">
                  <Button
                    className="btn-brand"
                    onClick={handleApply}
                    isLoading={isApplying}
                    disabled={!selectedJob || hasApplied}
                  >
                    {hasApplied ? "Applied" : "Apply"}
                  </Button>
                  <Button
                    className={
                      isFollowingCompany
                        ? "btn-brand bg-white text-[var(--brand)]"
                        : "btn-outline-brand"
                    }
                    onClick={toggleFollowCompany}
                    isLoading={isLoadingFollow}
                    disabled={!selectedJob?.companyId}
                  >
                    {isFollowingCompany ? "Unfollow" : "Follow company"}
                  </Button>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSaveJob(selectedJob.id)}
                      className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border transition ${
                        isJobSaved(selectedJob.id)
                          ? "border-white bg-white text-[var(--brand)]"
                          : "border-[var(--brandBlue)] text-[var(--brandBlue)] hover:bg-[var(--brandBlue)]/10"
                      }`}
                      aria-label={isJobSaved(selectedJob.id) ? "Unsave job" : "Save job"}
                    >
                      <svg
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="h-5 w-5"
                      >
                        <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1Z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--brandBlue)] text-[var(--brandBlue)] transition hover:bg-[var(--brandBlue)]/10"
                      aria-label="Share job"
                      onClick={handleShare}
                    >
                      <svg
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="h-5 w-5"
                      >
                        <path d="M7 12v7a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-7" />
                        <path d="M12 3v12" />
                        <path d="m8.5 6.5 3.5-3.5 3.5 3.5" />
                      </svg>
                    </button>
                  </div>
                </div>

                {applyError ? <p className="text-sm text-red-500">{applyError}</p> : null}
                {followError ? <p className="text-sm text-red-500">{followError}</p> : null}
                {shareError ? <p className="text-sm text-red-500">{shareError}</p> : null}
                {shareMessage ? <p className="text-sm text-green-500">{shareMessage}</p> : null}
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
