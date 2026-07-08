"use client";

import { FormEvent, useEffect, useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Header from "@/components/ui/HeaderWithIcons";

type JobType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP";

const JOB_TYPE_OPTIONS: Array<{ value: JobType; label: string }> = [
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "INTERNSHIP", label: "Internship" },
];

type JobFormState = {
  title: string;
  location: string;
  type: JobType;
  remote: boolean;
  description: string;
  skills: string[];
};

type CompanyJob = {
  id: string;
  title: string;
  location: string;
  type: JobType;
  remote: boolean;
  description: string;
  postedAt: string;
  skills: string[];
  status: "APPROVED" | "REJECTED";
};

const defaultFormState: JobFormState = {
  title: "",
  location: "",
  type: "FULL_TIME",
  remote: false,
  description: "",
  skills: [],
};

const coerceJobType = (value: unknown): JobType =>
  typeof value === "string" && JOB_TYPE_OPTIONS.some((option) => option.value === value)
    ? (value as JobType)
    : "FULL_TIME";

const getJobTypeLabel = (value: JobType) =>
  JOB_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? "Full-time";

const parseJob = (job: unknown): CompanyJob | null => {
  if (!job || typeof job !== "object") return null;
  const raw = job as Record<string, unknown>;

  const id = typeof raw.id === "string" ? raw.id : null;
  const title = typeof raw.title === "string" ? raw.title : null;
  const location = typeof raw.location === "string" ? raw.location : null;
  const description = typeof raw.description === "string" ? raw.description : null;

  const postedAtValue = raw.postedAt;
  let postedAt: string;

  if (typeof postedAtValue === "string") {
    postedAt = postedAtValue;
  } else if (postedAtValue instanceof Date) {
    postedAt = postedAtValue.toISOString();
  } else if (typeof postedAtValue === "number") {
    postedAt = new Date(postedAtValue).toISOString();
  } else {
    postedAt = new Date().toISOString();
  }

  if (!id || !title || !location || !description) return null;

  const skills = Array.isArray(raw.skills)
    ? raw.skills.filter((skill: unknown): skill is string => typeof skill === "string")
    : [];

  return {
    id,
    title,
    location,
    type: coerceJobType(raw.type),
    remote: Boolean(raw.remote),
    description,
    postedAt,
    skills,
    status: raw.status === "REJECTED" ? "REJECTED" : "APPROVED",
  };
};


export default function CompanyJobsPage() {
  const [companyJobs, setCompanyJobs] = useState<CompanyJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);

  const [jobForm, setJobForm] = useState<JobFormState>(defaultFormState);
  const [skillInput, setSkillInput] = useState("");
  const [jobFormErrors, setJobFormErrors] = useState<Partial<Record<keyof JobFormState, string>>>({});
  const [jobFormServerError, setJobFormServerError] = useState<string | null>(null);
  const [jobFormSuccess, setJobFormSuccess] = useState<string | null>(null);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [jobPendingDeletion, setJobPendingDeletion] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadCompanyJobs = async () => {
      setIsLoadingJobs(true);
      try {
        const response = await fetch("/api/jobs?scope=mine", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to load jobs (${response.status})`);
        }
        const payload = await response.json();
        if (!active) return;

        if (Array.isArray(payload.jobs)) {
          const parsed = payload.jobs
            .map((job: unknown) => parseJob(job))
            .filter((job: CompanyJob | null): job is CompanyJob => job !== null);
          setCompanyJobs(parsed);
        } else {
          setCompanyJobs([]);
        }
        setJobsError(null);
      } catch (error) {
        console.error("Unable to load company jobs", error);
        if (!active) return;
        setJobsError("We couldn't load your job listings.");
        setCompanyJobs([]);
      } finally {
        if (active) {
          setIsLoadingJobs(false);
        }
      }
    };

    loadCompanyJobs();

    return () => {
      active = false;
    };
  }, []);


  const jobBeingEdited =
    editingJobId ? companyJobs.find((job) => job.id === editingJobId) ?? null : null;

  const resetJobForm = ({ clearEditing = true, clearSuccess = false } = {}) => {
    setJobForm(defaultFormState);
    setSkillInput("");
    setJobFormErrors({});
    setJobFormServerError(null);
    if (clearEditing) {
      setEditingJobId(null);
    }
    if (clearSuccess) {
      setJobFormSuccess(null);
    }
  };

  const handleJobFieldChange = (field: keyof JobFormState, value: string | boolean | string[]) => {
    setJobForm((previous) => ({
      ...previous,
      [field]: value,
    }));
    if (jobFormErrors[field]) {
      setJobFormErrors((previous) => {
        const next = { ...previous };
        delete next[field];
        return next;
      });
    }
    setJobFormServerError(null);
  };

  const populateJobForm = (job: CompanyJob) => {
    setJobForm({
      title: job.title,
      location: job.location,
      type: job.type,
      remote: job.remote,
      description: job.description,
      skills: job.skills,
    });
    setSkillInput("");
    setJobFormErrors({});
    setJobFormServerError(null);
    setJobFormSuccess(null);
  };

  const handleSelectJobToEdit = (jobId: string) => {
    const job = companyJobs.find((item) => item.id === jobId);
    if (!job) return;
    populateJobForm(job);
    setEditingJobId(job.id);
  };

  const validateJobForm = () => {
    const errors: Partial<Record<keyof JobFormState, string>> = {};
    if (!jobForm.title.trim()) {
      errors.title = "Job title is required.";
    }
    if (!jobForm.location.trim()) {
      errors.location = "Location is required.";
    }
    if (!JOB_TYPE_OPTIONS.some((option) => option.value === jobForm.type)) {
      errors.type = "Select a job type.";
    }
    if (!jobForm.description.trim() || jobForm.description.trim().length < 20) {
      errors.description = "Add a short overview (at least 20 characters).";
    }
    setJobFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitJob = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setJobFormServerError(null);
    setJobFormSuccess(null);

    if (!validateJobForm()) {
      return;
    }

    setIsSubmitting(true);
    const isEditing = Boolean(editingJobId);
    const endpoint = isEditing && editingJobId ? `/api/jobs/${editingJobId}` : "/api/jobs";
    const method = isEditing ? "PATCH" : "POST";

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: jobForm.title.trim(),
          location: jobForm.location.trim(),
          type: jobForm.type,
          remote: jobForm.remote,
          description: jobForm.description.trim(),
          skills: jobForm.skills,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        if (payload?.issues?.fieldErrors) {
          const fieldErrors = payload.issues.fieldErrors as Record<string, string[]>;
          const nextErrors: Partial<Record<keyof JobFormState, string>> = {};
          Object.entries(fieldErrors).forEach(([field, messages]) => {
            if (messages?.length && field in jobForm) {
              nextErrors[field as keyof JobFormState] = messages[0] ?? "";
            }
          });
          if (Object.keys(nextErrors).length > 0) {
            setJobFormErrors(nextErrors);
          }
        }
        const errorMessage =
          typeof payload?.error === "string" ? payload.error : "Unable to save the job posting.";
        setJobFormServerError(errorMessage);
        return;
      }

      const jobPayload = parseJob(payload?.job);
      if (jobPayload) {
        setCompanyJobs((previous) => {
          const withoutCurrent = previous.filter((existing) => existing.id !== jobPayload.id);
          return [jobPayload, ...withoutCurrent];
        });
      }

      const successMessage = (() => {
        if (jobPayload?.title) {
          return isEditing
            ? `"${jobPayload.title}" was updated.`
            : `"${jobPayload.title}" is live for students.`;
        }
        return isEditing ? "Job updated successfully." : "Job posted successfully.";
      })();
      setJobFormSuccess(successMessage);
      resetJobForm({ clearEditing: true });
    } catch (error) {
      console.error("Failed to save job", error);
      setJobFormServerError("We couldn't reach the job service. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteJob = async () => {
    if (!jobPendingDeletion) return;
    setDeleteError(null);
    setDeleteSuccess(null);

    try {
      const response = await fetch(`/api/jobs/${jobPendingDeletion}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const errorMessage =
          typeof payload?.error === "string" ? payload.error : "Unable to delete the job.";
        setDeleteError(errorMessage);
        return;
      }

      setCompanyJobs((previous) => previous.filter((job) => job.id !== jobPendingDeletion));
      setDeleteSuccess("Job removed successfully.");
      if (editingJobId === jobPendingDeletion) {
        resetJobForm({ clearEditing: true, clearSuccess: true });
      }
    } catch (error) {
      console.error("Failed to delete job", error);
      setDeleteError("We couldn't reach the job service. Please try again.");
    } finally {
      setJobPendingDeletion(null);
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background text-foreground">

        {/* Filter bar */}
        <div className="shrink-0 border-b border-brand/10 bg-brand/5">
          <div className="mx-auto w-full max-w-6xl px-4 py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold text-brand">Manage job listings</h1>
                <p className="text-sm text-muted">
                  Review your open roles and publish new opportunities for students.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main content — full-height two-pane */}
        <div className="flex min-h-0 flex-1 gap-4 overflow-hidden p-4">

          {/* LEFT — job listings */}
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            {/* Panel header */}
            <div className="shrink-0 border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold text-brand">Your job listings</h2>
              <p className="text-sm text-muted">
                {isLoadingJobs
                  ? "Loading..."
                  : companyJobs.length === 0
                  ? "You haven't published any roles yet."
                  : `${companyJobs.length} job${companyJobs.length === 1 ? "" : "s"} visible to students`}
              </p>

              {deleteError ? (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
                  {deleteError}
                </div>
              ) : null}
              {deleteSuccess ? (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
                  {deleteSuccess}
                </div>
              ) : null}
            </div>

            {/* Scrollable job list */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {isLoadingJobs ? (
                <p className="text-sm text-muted">Loading job listings...</p>
              ) : jobsError ? (
                <p className="text-sm text-red-600">{jobsError}</p>
              ) : companyJobs.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border bg-background">
                  <p className="text-sm text-muted">No job listings yet. Post one using the form.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {companyJobs.map((job) => {
                    const isActiveEdit = editingJobId === job.id;
                    return (
                      <li
                        key={job.id}
                        className={`rounded-2xl border bg-background p-4 shadow-sm transition ${
                          isActiveEdit
                            ? "border-brand/40 ring-2 ring-brand/15"
                            : "border-border hover:border-brandBlue/40 hover:shadow-md"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 space-y-0.5">
                            <h3 className="flex items-center gap-2 truncate text-base font-semibold text-foreground">
                              {job.title}
                              {job.status === "REJECTED" ? (
                                <span className="shrink-0 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-700">
                                  Removed by admin
                                </span>
                              ) : null}
                            </h3>
                            <p className="text-xs text-muted">
                              {job.location}
                              <span className="mx-1.5 text-border">·</span>
                              {getJobTypeLabel(job.type)}
                              {job.remote ? (
                                <>
                                  <span className="mx-1.5 text-border">·</span>
                                  Remote friendly
                                </>
                              ) : null}
                            </p>
                            <p className="text-xs text-muted/70">
                              Posted {new Date(job.postedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-2">
                            <Button
                              type="button"
                              className={`h-8 rounded-lg px-3 text-xs font-semibold transition ${
                                isActiveEdit ? "bg-brand text-white" : "btn-outline-brand"
                              }`}
                              onClick={() => handleSelectJobToEdit(job.id)}
                              disabled={isSubmitting && isActiveEdit}
                            >
                              {isActiveEdit ? "Editing" : "Edit"}
                            </Button>
                            <Button
                              type="button"
                              className="h-8 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                              onClick={() => {
                                setJobPendingDeletion(job.id);
                                setDeleteError(null);
                                setDeleteSuccess(null);
                              }}
                              disabled={jobPendingDeletion === job.id}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>

                        {job.skills.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {job.skills.map((skill) => (
                              <span
                                key={`${job.id}-${skill}`}
                                className="rounded-full bg-brandBlue/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brandBlue"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* RIGHT — post / edit form */}
          <section className="flex min-h-0 w-[420px] shrink-0 flex-col overflow-hidden rounded-2xl bg-brand shadow-sm">
            {/* Panel header */}
            <div className="shrink-0 border-b border-white/10 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">
                {editingJobId ? "Edit job" : "Post a new job"}
              </h2>
              <p className="text-sm text-white/70">
                {editingJobId
                  ? "Update details for a role students can already see."
                  : "Publish a new role and make it visible to students immediately."}
              </p>
              {editingJobId && jobBeingEdited ? (
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Editing: {jobBeingEdited.title}
                </span>
              ) : null}
            </div>

            {/* Scrollable form */}
            <form className="min-h-0 flex-1 overflow-y-auto p-6" onSubmit={handleSubmitJob} noValidate>
              <div className="space-y-4">
                {jobFormServerError ? (
                  <div className="flex items-center gap-2 rounded-lg border border-red-300/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
                    {jobFormServerError}
                  </div>
                ) : null}

                {jobFormSuccess ? (
                  <div className="flex items-center gap-2 rounded-lg border border-green-400/40 bg-green-500/10 px-3 py-2 text-sm text-green-300">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
                    {jobFormSuccess}
                  </div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Job title"
                    value={jobForm.title}
                    onChange={(event) => handleJobFieldChange("title", event.target.value)}
                    placeholder="e.g. Analyst, Associate"
                    className="border-white/25 bg-white/10 text-white placeholder:text-white/45 focus:ring-white/20"
                    labelClassName="text-white/90"
                    error={jobFormErrors.title}
                  />
                  <Input
                    label="Location"
                    value={jobForm.location}
                    onChange={(event) => handleJobFieldChange("location", event.target.value)}
                    placeholder="City, State or Remote"
                    className="border-white/25 bg-white/10 text-white placeholder:text-white/45 focus:ring-white/20"
                    labelClassName="text-white/90"
                    error={jobFormErrors.location}
                  />
                </div>

                <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto]">
                  <div className="space-y-1">
                    <label htmlFor="job-type" className="block text-sm font-medium text-white/90">
                      Job type
                    </label>
                    <select
                      id="job-type"
                      value={jobForm.type}
                      onChange={(event) => handleJobFieldChange("type", event.target.value as JobType)}
                      className="h-10 w-full rounded-xl border border-white/25 bg-white/10 px-3 text-sm text-white outline-none transition focus:border-white/60 focus:ring-2 focus:ring-white/20"
                    >
                      {JOB_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value} className="text-black">{option.label}</option>
                      ))}
                    </select>
                    {jobFormErrors.type ? <p className="text-xs text-red-300">{jobFormErrors.type}</p> : null}
                  </div>
                  <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-sm text-white/90">
                    <input
                      type="checkbox"
                      checked={jobForm.remote}
                      onChange={(event) => handleJobFieldChange("remote", event.target.checked)}
                      className="h-4 w-4 accent-white"
                    />
                    Remote
                  </label>
                </div>

                <div className="space-y-1">
                  <label htmlFor="job-description" className="block text-sm font-medium text-white/90">
                    Description
                  </label>
                  <textarea
                    id="job-description"
                    rows={6}
                    value={jobForm.description}
                    onChange={(event) => handleJobFieldChange("description", event.target.value)}
                    placeholder="Share the mission, responsibilities, and what success looks like..."
                    className="w-full rounded-xl border border-white/25 bg-white/10 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/45 focus:border-white/60 focus:ring-2 focus:ring-white/20"
                  />
                  {jobFormErrors.description ? <p className="text-xs text-red-300">{jobFormErrors.description}</p> : null}
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-white/90">
                    Key skills
                  </label>
                  <div
                    className="flex min-h-[42px] flex-wrap gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3 py-2 transition focus-within:border-white/60 focus-within:ring-2 focus-within:ring-white/20"
                    onClick={(e) => {
                      const input = (e.currentTarget as HTMLElement).querySelector("input");
                      input?.focus();
                    }}
                  >
                    {jobForm.skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold text-white"
                      >
                        {skill}
                        <button
                          type="button"
                          aria-label={`Remove ${skill}`}
                          onClick={() =>
                            handleJobFieldChange(
                              "skills",
                              jobForm.skills.filter((s) => s !== skill)
                            )
                          }
                          className="ml-0.5 rounded-full p-0.5 hover:bg-white/20"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3" aria-hidden="true">
                            <path d="M18 6 6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          const val = skillInput.trim().replace(/,$/, "");
                          if (val && !jobForm.skills.includes(val)) {
                            handleJobFieldChange("skills", [...jobForm.skills, val]);
                          }
                          setSkillInput("");
                        } else if (e.key === "Backspace" && !skillInput && jobForm.skills.length > 0) {
                          handleJobFieldChange("skills", jobForm.skills.slice(0, -1));
                        }
                      }}
                      onBlur={() => {
                        const val = skillInput.trim().replace(/,$/, "");
                        if (val && !jobForm.skills.includes(val)) {
                          handleJobFieldChange("skills", [...jobForm.skills, val]);
                        }
                        setSkillInput("");
                      }}
                      placeholder={jobForm.skills.length === 0 ? "e.g. Excel, Financial Modeling, Python" : "Add a skill…"}
                      className="min-w-[140px] flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                    />
                  </div>
                  <p className="text-xs text-white/50">
                    Press Enter or comma to add a skill. Backspace removes the last one.
                  </p>
                  {jobFormErrors.skills ? <p className="text-xs text-red-300">{jobFormErrors.skills}</p> : null}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button type="submit" className="btn-brand border border-white/30 bg-white/15 hover:bg-white/25" isLoading={isSubmitting}>
                    {editingJobId ? "Update job" : "Publish job"}
                  </Button>
                  <Button
                    type="button"
                    className="h-10 rounded-xl border border-white/20 px-4 text-sm font-semibold text-white/75 transition hover:bg-white/10"
                    onClick={() => resetJobForm({ clearEditing: true, clearSuccess: true })}
                    disabled={isSubmitting}
                  >
                    Clear form
                  </Button>
                </div>
              </div>
            </form>
          </section>

        </div>

        {/* Delete confirmation dialog */}
        {jobPendingDeletion ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-border bg-background p-6 shadow-2xl">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-red-500" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground">Delete job listing</h3>
              <p className="mt-2 text-sm text-muted">
                Are you sure? Students will no longer be able to view or apply to this role once it is deleted.
              </p>
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  className="btn-outline-brand h-10"
                  onClick={() => { setJobPendingDeletion(null); setDeleteError(null); }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="h-10 rounded-xl bg-red-500 px-4 text-sm font-semibold text-white transition hover:bg-red-600"
                  onClick={handleDeleteJob}
                >
                  Delete job
                </Button>
              </div>
            </div>
          </div>
        ) : null}

      </main>
    </div>
  );
}
