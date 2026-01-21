"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Header from "@/components/ui/Header_with_Icons";
import Footer from "@/components/ui/Footer";

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
  headline: string | null;
  desiredLocation: string | null;
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

  const [applications, setApplications] = useState<ApplicantApplication[]>([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [savedApplicationIds, setSavedApplicationIds] = useState<Set<string>>(new Set());
  const [applicantsError, setApplicantsError] = useState<string | null>(null);
  const [isLoadingApplicants, setIsLoadingApplicants] = useState(false);

  const [showSavedOnly, setShowSavedOnly] = useState(false);

  useEffect(() => {
    let active = true;
    const loadJobs = async () => {
      setIsLoadingJobs(true);
      try {
        const response = await fetch("/api/jobs?scope=mine", { cache: "no-store" });
        const payload = await response.json().catch(() => null);
        if (!active) return;

        if (response.ok && Array.isArray(payload?.jobs)) {
          const parsed = payload.jobs
            .map((job: unknown): JobListing | null => parseJobListing(job))
            .filter((job: JobListing | null): job is JobListing => job !== null);

          setJobs(parsed);
          setJobsError(null);
          setSelectedJobId((current) =>
          parsed.some((job: JobListing) => job.id === current) ? current : parsed[0]?.id ?? "");

        } else {
          setJobs([]);
          const errorMessage =
            typeof payload?.error === "string"
              ? payload.error
              : "We couldn't load your job listings.";
          setJobsError(errorMessage);
        }
      } catch (error) {
        console.error("Unable to load company jobs", error);
        if (!active) return;
        setJobsError("We couldn't load your job listings.");
        setJobs([]);
      } finally {
        if (active) {
          setIsLoadingJobs(false);
        }
      }
    };

    loadJobs();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedJobId) {
      setApplications([]);
      setSelectedApplicationId(null);
      return;
    }

    let active = true;
    const loadApplicants = async () => {
      setIsLoadingApplicants(true);
      setApplicantsError(null);
      try {
        const response = await fetch(`/api/jobs/${selectedJobId}/applicants`, { cache: "no-store" });
        const payload = await response.json().catch(() => null);
        if (!active) return;

        if (!response.ok) {
          const errorMessage =
            typeof payload?.error === "string"
              ? payload.error
              : "We couldn't load applicants for this job.";
          setApplicantsError(errorMessage);
          setApplications([]);
          setSelectedApplicationId(null);
          return;
        }

        const parsedApplicants: ApplicantApplication[] = Array.isArray(payload?.applicants)
        ? payload.applicants
            .map((application: unknown) =>
              parseApplicantApplication(application, selectedJobId)
            )
            .filter(
              (application: ApplicantApplication | null): application is ApplicantApplication =>
                application !== null
            )
        : [];


        setApplications(parsedApplicants);
        setSelectedApplicationId((current) =>
          parsedApplicants.some((app) => app.applicationId === current)
            ? current
            : parsedApplicants[0]?.applicationId ?? null
        );
      } catch (error) {
        console.error("Unable to load applicants", error);
        if (!active) return;
        setApplicantsError("We couldn't load applicants for this job.");
        setApplications([]);
        setSelectedApplicationId(null);
      } finally {
        if (active) {
          setIsLoadingApplicants(false);
        }
      }
    };

    loadApplicants();
    return () => {
      active = false;
    };
  }, [selectedJobId]);

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

  return (
    <>
      <Header />
      <main className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
        <div className="border-b" style={{ borderColor: "var(--border)" }}>
          <div className="mx-auto w-full max-w-6xl px-4 py-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-[220px] flex-1">
                <Input
                  label="Search applicants"
                  placeholder="Search name, email, or skill..."
                  value={q}
                  onChange={handleSearchChange}
                  className="h-11"
                  labelClassName="text-white"
                />
              </div>

              <div className="flex min-w-[180px] flex-col gap-2">
                <label htmlFor="filter-skill" className="text-sm font-medium text-white">
                  Skill focus
                </label>
                <select
                  id="filter-skill"
                  value={skill}
                  onChange={(e) => setSkill(e.target.value)}
                  className="h-11 rounded-xl border border-white bg-[var(--surface)] px-3 text-sm text-white"
                >
                  <option className="text-black" value="">
                    All skills
                  </option>
                  {skillOptions.map((s) => (
                    <option key={s} value={s} className="text-black">
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex min-w-[200px] flex-col gap-2">
                <label htmlFor="filter-job" className="text-sm font-medium text-white">
                  Job Listing
                </label>
                <select
                  id="filter-job"
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="h-11 rounded-xl border border-white bg-[var(--surface)] px-3 text-sm text-white"
                >
                  <option className="text-black" value="">
                    Select a job
                  </option>
                  {jobs.length === 0 ? (
                    <option className="text-black" value="" disabled>
                      No job listings posted yet
                    </option>
                  ) : (
                    jobs.map((job) => (
                      <option key={job.id} value={job.id} className="text-black">
                        {job.title}
                      </option>
                    ))
                  )}
                </select>
                {jobsError ? <p className="text-xs text-red-400">{jobsError}</p> : null}
                {isLoadingJobs ? <p className="text-xs text-white/70">Loading jobs...</p> : null}
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-white">Saved applicants</span>
                <div className="flex items-center gap-2">
                  <Button
                    className={`h-11 rounded-xl border px-4 text-sm font-semibold transition ${
                      showSavedOnly
                        ? "border-white bg-white/10 text-white"
                        : "border-white text-white hover:bg-white/10"
                    }`}
                    onClick={() => setShowSavedOnly((prev) => !prev)}
                    disabled={applications.length === 0}
                  >
                    {showSavedOnly ? "Show all" : "Show saved"}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2 md:ml-auto">
                <span className="text-sm font-medium text-transparent">Actions</span>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    className="btn-outline-brand h-11"
                    onClick={() => {
                      setQ("");
                      setSkill("");
                    }}
                  >
                    Reset filters
                  </Button>
                </div>
              </div>
            </div>
            {applicantsError ? <p className="mt-2 text-sm text-red-400">{applicantsError}</p> : null}
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-hidden md:flex-row">
          <aside
            className="w-full border-b md:w-96 md:max-w-sm md:flex-shrink-0 md:border-b-0 md:border-r"
            style={{ borderColor: "var(--border)" }}
            aria-label="Applicant list"
          >
            <div className="h-full overflow-y-auto">
              <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
                {!selectedJobId ? (
                  <li className="p-4 text-sm opacity-80">Select a job to view applicants.</li>
                ) : isLoadingApplicants ? (
                  <li className="p-4 text-sm opacity-80">Loading applicants...</li>
                ) : filteredApplicants.length === 0 ? (
                  <li className="p-4 text-sm opacity-80">No applicants match your filters.</li>
                ) : (
                  filteredApplicants.map((candidate) => {
                    const active = candidate.applicationId === selectedApplicant?.applicationId;
                    const saved = isSaved(candidate.applicationId);
                    return (
                      <li key={candidate.applicationId}>
                        <button
                          type="button"
                          onClick={() => setSelectedApplicationId(candidate.applicationId)}
                          className={`w-full p-4 text-left transition ${active ? "bg-[var(--surface)] ring-1 ring-[var(--brandBlue)]" : "hover:bg-[var(--surface)]"}`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <h3 className="font-semibold">{candidate.applicant.name}</h3>
                              <p className="mt-1 text-sm opacity-90">
                                {candidate.applicant.headline ?? "No headline yet"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {saved ? (
                                <span className="rounded-md bg-[var(--brandBlue)] px-2 py-0.5 text-xs text-white">
                                  Saved
                                </span>
                              ) : null}
                              <span className="rounded-md border px-2 py-0.5 text-xs" style={{ borderColor: "var(--border)" }}>
                                {formatDate(candidate.submittedAt) || "Pending"}
                              </span>
                            </div>
                          </div>
                          <p className="mt-2 text-xs opacity-80">
                            {candidate.applicant.email ?? "Email unavailable"}
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
            {!selectedJobId ? (
              <div className="card">Select a job to view its applicants.</div>
            ) : isLoadingApplicants ? (
              <div className="card">Loading applicants for this job...</div>
            ) : !selectedApplicant ? (
              <div className="card">No applicants to show for this job yet.</div>
            ) : (
              <article className="card-wide flex h-full flex-col gap-6">
                <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold">{selectedApplicant.applicant.name}</h2>
                    <p className="opacity-90">
                      {selectedApplicant.applicant.headline ?? "No headline yet"}
                    </p>
                    <p className="text-sm opacity-80">
                      {selectedApplicant.applicant.desiredLocation
                        ? `Preferred location: ${selectedApplicant.applicant.desiredLocation}`
                        : "Location preference not provided."}
                    </p>
                    <p className="text-xs uppercase tracking-wide text-white/70">
                      Applied {formatDate(selectedApplicant.submittedAt) || "N/A"} • Status {selectedApplicant.status}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-2 text-sm opacity-90 md:items-end">
                    <span>{selectedApplicant.applicant.email ?? "Email unavailable"}</span>
                    {selectedJob ? <span>Job: {selectedJob.title}</span> : null}
                    <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs">
                      Application ID: {selectedApplicant.applicationId}
                    </span>
                  </div>
                </header>

                <section>
                  <h3 className="text-sm font-semibold uppercase tracking-wide opacity-80">Top skills</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedApplicant.applicant.skills.length === 0 ? (
                      <p className="text-sm opacity-80">No skills added yet.</p>
                    ) : (
                      selectedApplicant.applicant.skills.map((s) => (
                        <span
                          key={s.name}
                          className="rounded-xl px-3 py-1 text-xs"
                          style={{ backgroundColor: "var(--brandBlue)", color: "#fff" }}
                        >
                          {s.name}
                          {typeof s.years === "number" ? ` • ${s.years} yrs` : ""}
                        </span>
                      ))
                    )}
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide opacity-80">Experience</h3>
                  {selectedApplicant.applicant.experiences.length === 0 ? (
                    <p className="text-sm opacity-80">No experience listed.</p>
                  ) : (
                    selectedApplicant.applicant.experiences.map((item) => (
                      <div key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-semibold">{item.title ?? "Role not specified"}</p>
                            <p className="text-sm opacity-80">{item.company ?? "Company not specified"}</p>
                          </div>
                          <p className="text-xs opacity-70">
                            {[formatDate(item.startDate), formatDate(item.endDate)].filter(Boolean).join(" - ") || "Timing not provided"}
                          </p>
                        </div>
                        <p className="mt-1 text-xs opacity-70">{item.location ?? ""}</p>
                        {item.description ? <p className="mt-3 text-sm opacity-90">{item.description}</p> : null}
                      </div>
                    ))
                  )}
                </section>

                <section className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide opacity-80">Education</h3>
                  {selectedApplicant.applicant.degrees.length === 0 ? (
                    <p className="text-sm opacity-80">No education details listed.</p>
                  ) : (
                    selectedApplicant.applicant.degrees.map((degree) => (
                      <div key={degree.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                        <p className="font-semibold">{degree.school}</p>
                        <p className="text-sm opacity-80">
                          {[degree.degree, degree.field].filter(Boolean).join(" • ") || "Degree not specified"}
                        </p>
                        <p className="text-xs opacity-70">
                          {[formatDate(degree.startDate), formatDate(degree.endDate)].filter(Boolean).join(" - ") || "Dates not provided"}
                        </p>
                      </div>
                    ))
                  )}
                </section>

                <section className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide opacity-80">Certificates</h3>
                  {selectedApplicant.applicant.certificates.length === 0 ? (
                    <p className="text-sm opacity-80">No certificates listed.</p>
                  ) : (
                    selectedApplicant.applicant.certificates.map((cert) => (
                      <div key={cert.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                        <p className="font-semibold">{cert.name}</p>
                        <p className="text-sm opacity-80">{cert.issuer ?? "Issuer not provided"}</p>
                        <p className="text-xs opacity-70">
                          {cert.issuedAt ? `Issued ${formatDate(cert.issuedAt)}` : "Issued date not provided"}
                          {cert.expirationDate ? ` • Expires ${formatDate(cert.expirationDate)}` : ""}
                        </p>
                        {cert.credentialUrl ? (
                          <a
                            href={cert.credentialUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-[var(--brandBlue)] underline"
                          >
                            Credential link
                          </a>
                        ) : null}
                      </div>
                    ))
                  )}
                </section>

                <div className="mt-auto flex flex-wrap gap-3">
                  <Button className="btn-brand" onClick={() => selectedApplicant.applicant.resumeUrl && window.open(selectedApplicant.applicant.resumeUrl, "_blank")} disabled={!selectedApplicant.applicant.resumeUrl}>
                    {selectedApplicant.applicant.resumeUrl ? "View resume" : "No resume uploaded"}
                  </Button>
                  <Button
                    type="button"
                    className={
                      isSaved(selectedApplicant.applicationId)
                        ? "btn-brand h-11 bg-white text-[var(--brand)]"
                        : "btn-outline-brand h-11"
                    }
                    disabled={!selectedApplicant}
                    onClick={() => toggleSave(selectedApplicant.applicationId)}
                  >
                    {isSaved(selectedApplicant.applicationId) ? "Unsave" : "Save"}
                  </Button>
                </div>
              </article>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
