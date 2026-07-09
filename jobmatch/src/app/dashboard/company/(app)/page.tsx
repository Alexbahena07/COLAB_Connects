"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type ApplicantSkill = { name: string; years: number | null };
type ApplicantExperience = {
  id: string;
  title: string | null;
  company: string | null;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  employmentType: string | null;
  description: string | null;
};
type ApplicantDegree = {
  id: string;
  school: string;
  degree: string | null;
  field: string | null;
  startDate: string | null;
  endDate: string | null;
};
type ApplicantCertificate = {
  id: string;
  name: string;
  issuer: string | null;
  issuedAt: string | null;
  expirationDate: string | null;
  credentialId: string | null;
  credentialUrl: string | null;
};

type ApplicantProfile = {
  id: string;
  name: string;
  email: string | null;
  photoUrl: string | null;
  headline: string | null;
  desiredLocation: string | null;
  openToWork: boolean;
  resumeFileName: string | null;
  resumeFileType: string | null;
  resumeUrl: string | null;
  degrees: ApplicantDegree[];
  certificates: ApplicantCertificate[];
  experiences: ApplicantExperience[];
  skills: ApplicantSkill[];
};

type ApplicantApplication = {
  applicationId: string;
  jobId: string;
  status: string;
  submittedAt: string; // ISO
  applicant: ApplicantProfile;
};

type JobListing = {
  id: string;
  title: string;
};

const parseJobListing = (job: unknown): JobListing | null => {
  if (!job || typeof job !== "object") return null;
  const raw = job as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id : null;
  const title = typeof raw.title === "string" ? raw.title : null;
  if (!id || !title) return null;
  return { id, title };
};

const parseApplicantApplication = (
  application: unknown,
  fallbackJobId: string
): ApplicantApplication | null => {
  if (!application || typeof application !== "object") return null;
  const raw = application as Record<string, unknown>;
  const applicationIdCandidate =
    raw.applicationId ??
    raw.id ??
    (typeof raw["applicationID"] === "string" ? raw["applicationID"] : null);
  const applicationId = typeof applicationIdCandidate === "string" ? applicationIdCandidate : null;
  if (!applicationId) return null;

  const applicantRaw = raw.applicant;
  if (!applicantRaw || typeof applicantRaw !== "object") return null;

  const skills = Array.isArray((applicantRaw as ApplicantProfile).skills)
    ? (applicantRaw as ApplicantProfile).skills
    : [];

  return {
    applicationId,
    jobId: typeof raw.jobId === "string" ? raw.jobId : fallbackJobId,
    status: typeof raw.status === "string" ? raw.status : "SUBMITTED",
    submittedAt:
      typeof raw.submittedAt === "string" ? raw.submittedAt : new Date().toISOString(),
    applicant: {
      ...(applicantRaw as ApplicantProfile),
      skills,
    },
  };
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? "" : parsed.toLocaleDateString();
};

export default function CompanyDashboardPage() {
  const [q, setQ] = useState("");
  const [skill, setSkill] = useState("");
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);

  const [allApplications, setAllApplications] = useState<ApplicantApplication[]>([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [savedApplicationIds, setSavedApplicationIds] = useState<Set<string>>(new Set());
  const [applicantsError, setApplicantsError] = useState<string | null>(null);
  const [isLoadingApplicants, setIsLoadingApplicants] = useState(false);

  const [showSavedOnly, setShowSavedOnly] = useState(false);

  // Jobs and applicants used to be two sequential requests (load jobs, wait,
  // then load applicants for whichever job ended up selected). They're
  // independent of each other, so a single endpoint now loads both at once.
  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoadingJobs(true);
      setIsLoadingApplicants(true);
      try {
        const response = await fetch("/api/jobs/mine/applicants", { cache: "no-store" });
        const payload = await response.json().catch(() => null);
        if (!active) return;

        if (!response.ok) {
          const errorMessage =
            typeof payload?.error === "string"
              ? payload.error
              : "We couldn't load your job listings.";
          setJobsError(errorMessage);
          setApplicantsError(errorMessage);
          setJobs([]);
          setAllApplications([]);
          setSelectedJobId("");
          return;
        }

        const parsedJobs: JobListing[] = Array.isArray(payload?.jobs)
          ? payload.jobs
              .map((job: unknown): JobListing | null => parseJobListing(job))
              .filter((job: JobListing | null): job is JobListing => job !== null)
          : [];

        const parsedApplicants: ApplicantApplication[] = Array.isArray(payload?.applicants)
          ? payload.applicants
              .map((application: unknown) => parseApplicantApplication(application, ""))
              .filter(
                (application: ApplicantApplication | null): application is ApplicantApplication =>
                  application !== null
              )
          : [];

        setJobs(parsedJobs);
        setJobsError(null);
        setAllApplications(parsedApplicants);
        setApplicantsError(null);
        setSelectedJobId((current) =>
          parsedJobs.some((job: JobListing) => job.id === current) ? current : parsedJobs[0]?.id ?? ""
        );
      } catch (error) {
        console.error("Unable to load applicants", error);
        if (!active) return;
        const message = "We couldn't load your job listings.";
        setJobsError(message);
        setApplicantsError(message);
        setJobs([]);
        setAllApplications([]);
      } finally {
        if (active) {
          setIsLoadingJobs(false);
          setIsLoadingApplicants(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const applications = useMemo(
    () => allApplications.filter((application) => application.jobId === selectedJobId),
    [allApplications, selectedJobId]
  );

  const skillOptions = useMemo(() => {
  const unique = new Set<string>();
  applications.forEach((application: ApplicantApplication) =>
    application.applicant.skills.forEach((s) => {
      if (s?.name) unique.add(s.name);
    })
  );
  return Array.from(unique).sort();
}, [applications]);


  const filteredApplicants = useMemo(() => {
    const query = q.trim().toLowerCase();
    const base = showSavedOnly
    ? applications.filter((application: ApplicantApplication) =>
        savedApplicationIds.has(application.applicationId)
      )
    : applications;


    return base.filter((application: ApplicantApplication) => {
  const applicant = application.applicant;
  const matchesQuery =
    !query ||
    applicant.name.toLowerCase().includes(query) ||
    (applicant.email ?? "").toLowerCase().includes(query) ||
    (applicant.headline ?? "").toLowerCase().includes(query) ||
    applicant.skills.some((s) => s.name.toLowerCase().includes(query));

  const matchesSkill = !skill || applicant.skills.some((s) => s.name === skill);
  return matchesQuery && matchesSkill;
  });

  }, [applications, q, skill, savedApplicationIds, showSavedOnly]);

  useEffect(() => {
    if (filteredApplicants.length === 0) {
      setSelectedApplicationId(null);
      return;
    }

    if (!selectedApplicationId || !filteredApplicants.some((app) => app.applicationId === selectedApplicationId)) {
      setSelectedApplicationId(filteredApplicants[0].applicationId);
    }
  }, [filteredApplicants, selectedApplicationId]);

  const selectedApplicant =
    (selectedApplicationId
      ? filteredApplicants.find((app) => app.applicationId === selectedApplicationId)
      : filteredApplicants[0]) ?? null;

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? null,
    [jobs, selectedJobId]
  );

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => setQ(e.target.value);

  const toggleSave = (applicationId: string) => {
    setSavedApplicationIds((previous) => {
      const next = new Set(previous);
      if (next.has(applicationId)) {
        next.delete(applicationId);
      } else {
        next.add(applicationId);
      }
      return next;
    });
  };

  const isSaved = (applicationId: string | null) => {
    if (!applicationId) return false;
    return savedApplicationIds.has(applicationId);
  };

  const getInitials = (name: string) =>
    name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

  return (
      <main className="flex flex-1 flex-col bg-background text-foreground md:min-h-0 md:overflow-hidden">

        {/* Filter bar */}
        <div className="shrink-0 border-b border-brand/10 bg-brand/5">
          <div className="mx-auto w-full max-w-6xl px-4 py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold text-brand">Browse applicants</h1>
                <p className="text-sm text-muted">
                  Filter by name, skill, or job listing. Save top candidates for follow-up.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  className="btn-outline-brand h-10"
                  onClick={() => setShowSavedOnly((prev) => !prev)}
                  disabled={applications.length === 0}
                >
                  {showSavedOnly ? "Show all" : "Show saved"}
                </Button>
                <Button
                  className="btn-outline-brand h-10"
                  onClick={() => { setQ(""); setSkill(""); }}
                >
                  Reset filters
                </Button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Search"
                placeholder="Name, email, or skill..."
                value={q}
                onChange={handleSearchChange}
                className="h-11 border-border bg-background text-foreground placeholder:text-muted"
              />

              <div className="flex flex-col gap-2">
                <label htmlFor="filter-skill" className="text-sm font-medium text-foreground">
                  Skill focus
                </label>
                <select
                  id="filter-skill"
                  value={skill}
                  onChange={(e) => setSkill(e.target.value)}
                  className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-brand"
                >
                  <option value="">All skills</option>
                  {skillOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2 lg:col-span-2">
                <label htmlFor="filter-job" className="text-sm font-medium text-foreground">
                  Job listing
                </label>
                <select
                  id="filter-job"
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-brand"
                >
                  <option value="">Select a job</option>
                  {jobs.length === 0 ? (
                    <option value="" disabled>No job listings posted yet</option>
                  ) : (
                    jobs.map((job) => (
                      <option key={job.id} value={job.id}>{job.title}</option>
                    ))
                  )}
                </select>
                {jobsError ? <p className="text-xs text-red-600">{jobsError}</p> : null}
                {isLoadingJobs ? <p className="text-xs text-muted">Loading jobs...</p> : null}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-sm text-muted">
                {isLoadingApplicants
                  ? "Loading applicants..."
                  : `${filteredApplicants.length} applicant${filteredApplicants.length === 1 ? "" : "s"} found`}
              </p>
              {applicantsError ? (
                <p className="mt-1 text-xs text-red-600">{applicantsError}</p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col gap-4 p-4 md:min-h-0 md:flex-row md:overflow-hidden">

          {/* Applicant sidebar */}
          <aside
            className="flex max-h-[45vh] w-full shrink-0 flex-col overflow-hidden rounded-2xl bg-brandBlue md:max-h-none md:min-h-0 md:w-96 md:max-w-sm"
            aria-label="Applicant list"
          >
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ul className="divide-y divide-white/10">
                {!selectedJobId ? (
                  <li className="p-4 text-sm text-white/70">Select a job to view applicants.</li>
                ) : isLoadingApplicants ? (
                  <li className="p-4 text-sm text-white/70">Loading applicants...</li>
                ) : filteredApplicants.length === 0 ? (
                  <li className="p-4 text-sm text-white/70">No applicants match your filters.</li>
                ) : (
                  filteredApplicants.map((candidate) => {
                    const active = candidate.applicationId === selectedApplicant?.applicationId;
                    const saved = isSaved(candidate.applicationId);
                    return (
                      <li key={candidate.applicationId}>
                        <button
                          type="button"
                          onClick={() => setSelectedApplicationId(candidate.applicationId)}
                          className={`group w-full p-4 text-left transition ${
                            active
                              ? "border-l-4 border-l-white bg-white/20"
                              : "border-l-4 border-l-transparent hover:border-l-white hover:bg-brand"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              {candidate.applicant.photoUrl ? (
                                <img
                                  src={candidate.applicant.photoUrl}
                                  alt={candidate.applicant.name}
                                  className={`h-10 w-10 shrink-0 rounded-xl border object-cover transition ${
                                    active ? "border-white/60" : "border-white/30 group-hover:border-white/60"
                                  }`}
                                />
                              ) : (
                                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-xs font-semibold transition ${
                                  active
                                    ? "border-white/60 bg-white/25 text-white"
                                    : "border-white/30 bg-white/15 text-white group-hover:border-white/60 group-hover:bg-white/25"
                                }`}>
                                  {getInitials(candidate.applicant.name)}
                                </div>
                              )}
                              <div>
                                <h3 className="font-semibold text-white">{candidate.applicant.name}</h3>
                                <p className="mt-0.5 text-xs text-white/70 group-hover:text-white/85">
                                  {candidate.applicant.headline ?? "No headline yet"}
                                </p>
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                              {saved ? (
                                <span className="rounded-md bg-white/20 px-2 py-0.5 text-xs font-medium text-white">
                                  Saved
                                </span>
                              ) : null}
                              {candidate.applicant.openToWork ? (
                                <span className="rounded-md bg-emerald-400/25 px-2 py-0.5 text-xs font-medium text-emerald-50">
                                  Open to work
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <p className="mt-2 text-xs text-white/55 group-hover:text-white/70">
                            {formatDate(candidate.submittedAt) || "Pending"}
                          </p>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </aside>

          {/* Detail panel */}
          <section className="w-full flex-1 rounded-2xl bg-background md:min-h-0 md:overflow-hidden">
            {!selectedJobId ? (
              <div className="flex h-full items-center justify-center text-sm text-muted">
                Select a job to view its applicants.
              </div>
            ) : isLoadingApplicants ? (
              <div className="flex h-full items-center justify-center text-sm text-muted">
                Loading applicants for this job...
              </div>
            ) : !selectedApplicant ? (
              <div className="flex h-full items-center justify-center text-sm text-muted">
                No applicants to show for this job yet.
              </div>
            ) : (
              <div className="flex h-full flex-col lg:flex-row">

                {/* LEFT — scrollable main content */}
                <div className="min-h-0 flex-1 overflow-y-auto border-b border-border p-6 lg:border-b-0 lg:border-r">
                  <div className="flex items-start gap-4">
                    {selectedApplicant.applicant.photoUrl ? (
                      <img
                        src={selectedApplicant.applicant.photoUrl}
                        alt={selectedApplicant.applicant.name}
                        className="h-14 w-14 shrink-0 rounded-xl border border-brandBlue/40 object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-brandBlue/40 bg-brandBlue/10 text-sm font-semibold text-brandBlue">
                        {getInitials(selectedApplicant.applicant.name)}
                      </div>
                    )}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-bold text-foreground">{selectedApplicant.applicant.name}</h2>
                        {selectedApplicant.applicant.openToWork ? (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                            Open to work
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-muted">{selectedApplicant.applicant.headline ?? "No headline yet"}</p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Skills</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedApplicant.applicant.skills.length === 0 ? (
                        <p className="text-sm text-muted">No skills added yet.</p>
                      ) : (
                        selectedApplicant.applicant.skills.map((s) => (
                          <span
                            key={s.name}
                            className="rounded-full bg-brandBlue/10 px-3 py-1 text-xs font-semibold text-brandBlue"
                          >
                            {s.name}
                            {typeof s.years === "number" ? ` • ${s.years} yrs` : ""}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Experience</h3>
                    {selectedApplicant.applicant.experiences.length === 0 ? (
                      <p className="text-sm text-muted">No experience listed.</p>
                    ) : (
                      selectedApplicant.applicant.experiences.map((item) => (
                        <div key={item.id} className="rounded-xl border border-border bg-surface p-4">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-semibold text-foreground">{item.title ?? "Role not specified"}</p>
                              <p className="text-sm text-muted">{item.company ?? "Company not specified"}</p>
                            </div>
                            <p className="shrink-0 text-xs text-muted">
                              {[formatDate(item.startDate), formatDate(item.endDate)].filter(Boolean).join(" – ") || "Timing not provided"}
                            </p>
                          </div>
                          {item.location ? <p className="mt-1 text-xs text-muted">{item.location}</p> : null}
                          {item.description ? <p className="mt-3 text-sm leading-relaxed text-foreground/85">{item.description}</p> : null}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-6 space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Education</h3>
                    {selectedApplicant.applicant.degrees.length === 0 ? (
                      <p className="text-sm text-muted">No education details listed.</p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {selectedApplicant.applicant.degrees.map((degree) => (
                          <div key={degree.id} className="rounded-xl border border-border bg-surface p-4">
                            <p className="font-semibold text-brand">{degree.school}</p>
                            <p className="text-sm text-muted">
                              {[degree.degree, degree.field].filter(Boolean).join(" · ") || "Degree not specified"}
                            </p>
                            <p className="mt-1 text-xs text-muted/70">
                              {[formatDate(degree.startDate), formatDate(degree.endDate)].filter(Boolean).join(" – ") || "Dates not provided"}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedApplicant.applicant.certificates.length > 0 ? (
                    <div className="mt-6 space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Certificates</h3>
                      {selectedApplicant.applicant.certificates.map((cert) => (
                        <div key={cert.id} className="rounded-xl border border-border bg-surface p-4">
                          <p className="font-semibold text-brand">{cert.name}</p>
                          <p className="text-sm text-muted">{cert.issuer ?? "Issuer not provided"}</p>
                          <p className="text-xs text-muted">
                            {cert.issuedAt ? `Issued ${formatDate(cert.issuedAt)}` : "Issued date not provided"}
                            {cert.expirationDate ? ` · Expires ${formatDate(cert.expirationDate)}` : ""}
                          </p>
                          {cert.credentialUrl ? (
                            <a href={cert.credentialUrl} target="_blank" rel="noreferrer"
                              className="mt-2 inline-flex text-xs font-semibold text-brandBlue underline underline-offset-4">
                              View credential
                            </a>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* RIGHT — sticky sidebar */}
                <div className="w-full shrink-0 p-6 lg:w-72 lg:overflow-y-auto">
                  <div className="space-y-4 lg:sticky lg:top-6">
                    <Button
                      className="w-full h-11 btn-brand"
                      onClick={() => selectedApplicant.applicant.resumeUrl && window.open(selectedApplicant.applicant.resumeUrl, "_blank")}
                      disabled={!selectedApplicant.applicant.resumeUrl}
                    >
                      {selectedApplicant.applicant.resumeUrl ? "View resume" : "No resume uploaded"}
                    </Button>

                    <Button
                      type="button"
                      className={`w-full h-11 ${isSaved(selectedApplicant.applicationId) ? "btn-brand" : "btn-outline-brand"}`}
                      onClick={() => toggleSave(selectedApplicant.applicationId)}
                    >
                      {isSaved(selectedApplicant.applicationId) ? "Unsave" : "Save applicant"}
                    </Button>

                    <div className="rounded-xl border border-border bg-surface p-4">
                      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Contact</h3>
                      <p className="mt-2 break-all text-sm text-foreground">
                        {selectedApplicant.applicant.email ?? "Email unavailable"}
                      </p>
                      {selectedApplicant.applicant.desiredLocation ? (
                        <p className="mt-1 text-sm text-muted">{selectedApplicant.applicant.desiredLocation}</p>
                      ) : null}
                    </div>

                    <div className="rounded-xl border border-border bg-surface p-4">
                      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Application</h3>
                      <p className="mt-2 text-sm text-foreground">
                        Applied {formatDate(selectedApplicant.submittedAt) || "N/A"}
                      </p>
                      {selectedJob ? (
                        <p className="mt-1 text-sm text-muted">{selectedJob.title}</p>
                      ) : null}
                    </div>
                  </div>
                </div>

              </div>
            )}
          </section>
        </div>
      </main>
  );
}
