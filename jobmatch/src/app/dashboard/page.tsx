"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Header from "@/components/ui/HeaderWithIcons";
import Footer from "@/components/ui/Footer";

type EventPost = {
  id: string;
  title: string;
  about: string;
  link: string | null;
  linkLabel: string | null;
  imageUrl: string | null;
  companyId: string;
  companyName: string;
  companyImage: string | null;
  createdAt: string;
};

type ListItem =
  | { key: string; kind: "job"; sortTime: number; job: Job }
  | { key: string; kind: "event"; sortTime: number; event: EventPost };

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

function DashboardContent() {
  const searchParams = useSearchParams();
  const urlKey = useMemo(() => {
    const jobId = searchParams.get("jobId");
    if (jobId) return `job:${jobId}`;
    const eventId = searchParams.get("eventId");
    if (eventId) return `event:${eventId}`;
    return null;
  }, [searchParams]);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [location, setLocation] = useState("");
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [viewFilter, setViewFilter] = useState<"all" | "jobs" | "events">("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  const [events, setEvents] = useState<EventPost[]>([]);

  useEffect(() => {
    let active = true;
    const loadEvents = async () => {
      try {
        const response = await fetch("/api/events", { cache: "no-store" });
        const payload = await response.json().catch(() => null);
        if (!active) return;
        if (response.ok && Array.isArray(payload?.posts)) {
          setEvents(payload.posts);
        }
      } catch (error) {
        console.error("Unable to load company events", error);
      }
    };
    loadEvents();
    return () => {
      active = false;
    };
  }, []);

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

  const filteredEvents = useMemo(() => {
    if (showSavedOnly) return [];
    const query = q.toLowerCase().trim();
    if (!query) return events;
    return events.filter(
      (event) =>
        event.title.toLowerCase().includes(query) ||
        event.companyName.toLowerCase().includes(query) ||
        event.about.toLowerCase().includes(query)
    );
  }, [events, q, showSavedOnly]);

  const listItems: ListItem[] = useMemo(() => {
    const jobItems: ListItem[] =
      viewFilter === "events"
        ? []
        : filteredJobs.map((job) => ({
            key: `job:${job.id}`,
            kind: "job",
            sortTime: new Date(job.postedAt).getTime(),
            job,
          }));
    const eventItems: ListItem[] =
      viewFilter === "jobs"
        ? []
        : filteredEvents.map((event) => ({
            key: `event:${event.id}`,
            kind: "event",
            sortTime: new Date(event.createdAt).getTime(),
            event,
          }));
    return [...jobItems, ...eventItems].sort((a, b) => b.sortTime - a.sortTime);
  }, [filteredJobs, filteredEvents, viewFilter]);

  useEffect(() => {
    if (listItems.length === 0) {
      setSelectedKey(null);
      return;
    }

    if (!selectedKey || !listItems.some((item) => item.key === selectedKey)) {
      const preferred =
        urlKey && listItems.some((item) => item.key === urlKey) ? urlKey : listItems[0].key;
      setSelectedKey(preferred);
    }
  }, [listItems, selectedKey, urlKey]);

  const selectedItem =
    (selectedKey ? listItems.find((item) => item.key === selectedKey) : listItems[0]) ?? null;
  const selectedJob = selectedItem?.kind === "job" ? selectedItem.job : null;
  const selectedEvent = selectedItem?.kind === "event" ? selectedItem.event : null;
  const hasApplied = selectedJob ? appliedJobIds.has(selectedJob.id) : false;

  useEffect(() => {
    setApplyError(null);
    setIsApplying(false);
  }, [selectedKey]);

  const noJobsAvailable =
    !isLoading &&
    jobs.length === 0 &&
    events.length === 0 &&
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

  const activeFieldFilterCount = [q.trim() !== "", type !== "", location.trim() !== "", remoteOnly].filter(
    Boolean
  ).length;

  return (
    <div className="flex min-h-screen flex-col md:h-screen md:overflow-hidden">
      <Header />
      <main className="flex flex-1 flex-col bg-background text-foreground md:min-h-0 md:overflow-hidden">
        <div className="shrink-0 border-b border-brand/10 bg-brand/5">
          <div className="mx-auto w-full max-w-6xl px-4 py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-brand">Browse opportunities</h1>
                <p className="text-sm text-muted">
                  Filter jobs and events by skill, location, type, or remote status and save your top picks.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-xl border border-border bg-background p-1">
                  {(
                    [
                      { value: "all", label: "All" },
                      { value: "jobs", label: "Jobs only" },
                      { value: "events", label: "Events only" },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setViewFilter(option.value)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                        viewFilter === option.value
                          ? "bg-brand text-white"
                          : "text-foreground/70 hover:bg-brand/10"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <Button
                  className="btn-outline-brand h-10"
                  onClick={() => setShowSavedOnly((prev) => !prev)}
                >
                  {showSavedOnly ? "Show all" : "Saved"}
                </Button>
              </div>
            </div>

            {/* Filters toggle — mobile only. Keeps the search/type/location/remote
                fields out of the way by default so the list gets more vertical
                space; the view tabs and saved/reset buttons above stay visible
                since they're compact and used more often. */}
            <button
              type="button"
              onClick={() => setFiltersOpen((prev) => !prev)}
              aria-expanded={filtersOpen}
              className="mt-4 flex w-full items-center justify-between rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground md:hidden"
            >
              <span className="flex items-center gap-2">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
                  <line x1="4" y1="18" x2="20" y2="18" />
                  <circle cx="11" cy="18" r="2" fill="currentColor" stroke="none" />
                </svg>
                Filters
                {activeFieldFilterCount > 0 ? (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-xs font-semibold text-white">
                    {activeFieldFilterCount}
                  </span>
                ) : null}
              </span>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`h-4 w-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            <div
              className={`mt-4 gap-4 md:mt-6 md:grid md:grid-cols-2 lg:grid-cols-4 ${
                filtersOpen ? "grid" : "hidden"
              }`}
            >
              <Input
                label="Search"
                placeholder="Title, company, or skill"
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

              <div className="flex justify-end md:col-span-2 lg:col-span-4">
                <Button
                  className="btn-outline-brand h-10"
                  onClick={() => {
                    setQ("");
                    setType("");
                    setRemoteOnly(false);
                    setLocation("");
                    setShowSavedOnly(false);
                    setViewFilter("all");
                  }}
                >
                  Reset filters
                </Button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">
                {isLoading
                  ? "Loading jobs..."
                  : viewFilter === "jobs"
                  ? `${filteredJobs.length} job${filteredJobs.length === 1 ? "" : "s"} found`
                  : viewFilter === "events"
                  ? `${filteredEvents.length} event${filteredEvents.length === 1 ? "" : "s"} found`
                  : `${filteredJobs.length} job${filteredJobs.length === 1 ? "" : "s"} found${
                      filteredEvents.length > 0
                        ? ` · ${filteredEvents.length} event${filteredEvents.length === 1 ? "" : "s"}`
                        : ""
                    }`}
              </p>
            </div>

            {loadError ? (
              <div className="mt-3 rounded-lg border border-yellow-400 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
                {loadError}
              </div>
            ) : null}
          </div>
        </div>

      <div className="flex flex-1 flex-col gap-4 p-4 md:min-h-0 md:flex-row md:overflow-hidden">
        <aside
          className="flex max-h-[45vh] w-full shrink-0 flex-col overflow-hidden rounded-2xl bg-brandBlue md:max-h-none md:min-h-0 md:w-96 md:max-w-sm"
          aria-label="Job and event list"
        >
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ul className="divide-y divide-white/10">
              {isLoading ? (
                <li className="p-4 text-sm text-white/70">Loading jobs...</li>
              ) : listItems.length === 0 ? (
                <li className="p-4 text-sm text-white/70">
                  {showSavedOnly
                    ? "You haven't saved any jobs yet."
                    : viewFilter === "events"
                    ? "No events posted yet."
                    : noJobsAvailable
                    ? "No job listings are available yet."
                    : "No results. Try adjusting filters."}
                </li>
              ) : (
                listItems.map((item) => {
                  const active = item.key === selectedItem?.key;
                  if (item.kind === "job") {
                    const job = item.job;
                    return (
                      <li key={item.key}>
                        <button
                          type="button"
                          onClick={() => setSelectedKey(item.key)}
                          className={`group w-full p-4 text-left transition ${
                            active
                              ? "border-l-4 border-l-white bg-white/20"
                              : "border-l-4 border-l-transparent hover:border-l-white hover:bg-brand"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border text-xs font-semibold transition ${
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
                  }

                  const event = item.event;
                  return (
                    <li key={item.key}>
                      <button
                        type="button"
                        onClick={() => setSelectedKey(item.key)}
                        className={`group w-full p-4 text-left transition ${
                          active
                            ? "border-l-4 border-l-white bg-white/20"
                            : "border-l-4 border-l-transparent hover:border-l-white hover:bg-brand"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border text-xs font-semibold transition ${
                              active
                                ? "border-white/60 bg-white/25 text-white"
                                : "border-white/30 bg-white/15 text-white group-hover:border-white/60 group-hover:bg-white/25"
                            }`}>
                              {event.imageUrl || event.companyImage ? (
                                <img
                                  src={event.imageUrl || event.companyImage || ""}
                                  alt={`${event.companyName} logo`}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                getCompanyInitials(event.companyName)
                              )}
                            </div>
                            <div>
                              <h3 className={`font-semibold text-white transition ${active ? "opacity-100" : "opacity-90 group-hover:opacity-100"}`}>{event.title}</h3>
                              <p className="mt-1 text-sm text-white/65 transition group-hover:text-white/80">
                                {event.companyName}
                              </p>
                            </div>
                          </div>
                          <span className="rounded-md bg-white/20 px-2 py-0.5 text-xs font-medium text-white">
                            Event
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-white/55 transition group-hover:text-white/70">
                          {new Date(event.createdAt).toLocaleDateString()}
                        </p>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </aside>

        <section className="w-full flex-1 rounded-2xl bg-background md:min-h-0 md:overflow-y-auto">
          {!selectedItem ? (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              Select a job or event to view details.
            </div>
          ) : selectedEvent ? (
            <div className="flex h-full flex-col gap-0 lg:flex-row">
              {/* LEFT — description */}
              <div className="min-h-0 flex-1 overflow-y-auto border-b border-border p-6 lg:border-b-0 lg:border-r">
                {/* Event header */}
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-brand/10 text-sm font-bold text-brand">
                    {selectedEvent.imageUrl || selectedEvent.companyImage ? (
                      <img
                        src={selectedEvent.imageUrl || selectedEvent.companyImage || ""}
                        alt={`${selectedEvent.companyName} logo`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getCompanyInitials(selectedEvent.companyName)
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">{selectedEvent.title}</h2>
                    <p className="mt-1 text-sm text-muted">{selectedEvent.companyName} · Event</p>
                  </div>
                </div>

                {/* Description */}
                <div className="mt-6">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">About this event</h3>
                  <p className="mt-3 text-sm leading-relaxed text-foreground/85">{selectedEvent.about}</p>
                </div>
              </div>

              {/* RIGHT — sticky action sidebar */}
              <div className="w-full shrink-0 p-6 lg:w-72 lg:overflow-y-auto">
                <div className="lg:sticky lg:top-6 space-y-4">
                  {selectedEvent.link ? (
                    <a href={selectedEvent.link} target="_blank" rel="noreferrer" className="block">
                      <Button className="btn-brand w-full h-11 text-base">
                        {selectedEvent.linkLabel || "Learn more"}
                      </Button>
                    </a>
                  ) : null}

                  {/* Divider */}
                  <div className="h-px bg-border" />

                  {/* Company card */}
                  <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Company</h3>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-brand/10 text-xs font-bold text-brand">
                        {selectedEvent.companyImage ? (
                          <img src={selectedEvent.companyImage} alt={`${selectedEvent.companyName} logo`} className="h-full w-full object-cover" />
                        ) : (
                          getCompanyInitials(selectedEvent.companyName)
                        )}
                      </div>
                      <p className="font-semibold text-foreground">{selectedEvent.companyName}</p>
                    </div>
                    {selectedEvent.companyId && (
                      <Link href={`/companies/${selectedEvent.companyId}`} className="block">
                        <Button className="btn-outline-brand w-full h-9 text-sm">
                          View company profile
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : selectedJob ? (
            <div className="flex h-full flex-col gap-0 lg:flex-row">

              {/* LEFT — description */}
              <div className="min-h-0 flex-1 overflow-y-auto border-b border-border p-6 lg:border-b-0 lg:border-r">
                {/* Job header */}
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-brand/10 text-sm font-bold text-brand">
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
                    <h2 className="text-2xl font-bold text-foreground">{selectedJob.title}</h2>
                    <p className="mt-1 text-sm text-muted">
                      {selectedJob.company} · {selectedJob.location}
                      {selectedJob.remote ? " · Remote friendly" : ""}
                    </p>
                  </div>
                </div>

                {/* Skills */}
                {selectedJob.skills.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Key skills</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedJob.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-brandBlue/10 px-3 py-1 text-xs font-semibold text-brandBlue"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                <div className="mt-6">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">About this role</h3>
                  <p className="mt-3 text-sm leading-relaxed text-foreground/85">{selectedJob.description}</p>
                </div>
              </div>

              {/* RIGHT — sticky action sidebar */}
              <div className="w-full shrink-0 p-6 lg:w-72 lg:overflow-y-auto">
                <div className="lg:sticky lg:top-6 space-y-4">

                  {/* Apply button */}
                  <Button
                    className="btn-brand w-full h-11 text-base"
                    onClick={handleApply}
                    isLoading={isApplying}
                    disabled={!selectedJob || hasApplied}
                  >
                    {hasApplied ? "Applied ✓" : "Apply now"}
                  </Button>

                  {applyError && <p className="text-xs text-red-500">{applyError}</p>}

                  {/* Save + Share */}
                  <div className="flex gap-2">
                    <Button
                      className={`flex-1 h-10 gap-1.5 text-sm ${
                        isJobSaved(selectedJob.id)
                          ? "btn-brand"
                          : "btn-outline-brand"
                      }`}
                      onClick={() => toggleSaveJob(selectedJob.id)}
                    >
                      <svg viewBox="0 0 24 24" fill={isJobSaved(selectedJob.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden="true">
                        <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z" />
                      </svg>
                      {isJobSaved(selectedJob.id) ? "Saved" : "Save"}
                    </Button>
                    <Button
                      className="btn-outline-brand h-10 w-10 shrink-0 p-0"
                      aria-label="Share job"
                      onClick={() => handleShareJob(selectedJob)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden="true">
                        <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
                        <path d="M12 16V4" />
                        <path d="m8 8 4-4 4 4" />
                      </svg>
                    </Button>
                  </div>
                  {shareNotice && <p className="text-xs text-muted">{shareNotice}</p>}
                  {shareError && <p className="text-xs text-red-500">{shareError}</p>}

                  {/* Divider */}
                  <div className="h-px bg-border" />

                  {/* Job meta */}
                  <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-foreground/80">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0 text-muted" aria-hidden="true">
                          <rect x="4" y="7" width="16" height="11" rx="2"/><path d="M9 7V5.5a2.5 2.5 0 0 1 5 0V7"/>
                        </svg>
                        {JOB_TYPE_LABEL[selectedJob.type]}
                      </div>
                      <div className="flex items-center gap-2 text-foreground/80">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0 text-muted" aria-hidden="true">
                          <path d="M12 2C8.686 2 6 4.686 6 8c0 5.25 6 13 6 13s6-7.75 6-13c0-3.314-2.686-6-6-6Z"/><circle cx="12" cy="8" r="2"/>
                        </svg>
                        {selectedJob.location}
                      </div>
                      {selectedJob.remote && (
                        <div className="flex items-center gap-2 text-foreground/80">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0 text-muted" aria-hidden="true">
                            <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                          </svg>
                          Remote friendly
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-foreground/80">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0 text-muted" aria-hidden="true">
                          <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                        </svg>
                        Posted {new Date(selectedJob.postedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Company card */}
                  <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Company</h3>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-brand/10 text-xs font-bold text-brand">
                        {selectedJob.companyImage ? (
                          <img src={selectedJob.companyImage} alt={`${selectedJob.company} logo`} className="h-full w-full object-cover" />
                        ) : (
                          getCompanyInitials(selectedJob.company)
                        )}
                      </div>
                      <p className="font-semibold text-foreground">{selectedJob.company}</p>
                    </div>
                    {selectedJob.companyId && (
                      <Link href={`/companies/${selectedJob.companyId}`} className="block">
                        <Button className="btn-outline-brand w-full h-9 text-sm">
                          View company profile
                        </Button>
                      </Link>
                    )}
                  </div>

                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center text-sm text-muted">
          Loading...
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
