"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Header from "@/components/ui/Header_with_Icons";
import Footer from "@/components/ui/Footer";

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
  skills: string;
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
};

const defaultFormState: JobFormState = {
  title: "",
  location: "",
  type: "FULL_TIME",
  remote: false,
  description: "",
  skills: "",
};

const coerceJobType = (value: unknown): JobType =>
  typeof value === "string" && JOB_TYPE_OPTIONS.some((option) => option.value === value)
    ? (value as JobType)
    : "FULL_TIME";

const getJobTypeLabel = (value: JobType) =>
  JOB_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? "Full-time";

const normalizeSkillsInput = (value: string) =>
  value
    .split(",")
    .map((skill) => skill.trim())
    .filter((skill, index, array) => skill.length > 0 && array.indexOf(skill) === index);

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
  };
};


export default function CompanyJobsPage() {
  const [companyJobs, setCompanyJobs] = useState<CompanyJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);

  const [jobForm, setJobForm] = useState<JobFormState>(defaultFormState);
  const [jobFormErrors, setJobFormErrors] = useState<Partial<Record<keyof JobFormState, string>>>({});
  const [jobFormServerError, setJobFormServerError] = useState<string | null>(null);
  const [jobFormSuccess, setJobFormSuccess] = useState<string | null>(null);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [jobsFilter, setJobsFilter] = useState("");
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

  const filteredJobs = useMemo(() => {
    const query = jobsFilter.trim().toLowerCase();
    if (!query) return companyJobs;
    return companyJobs.filter((job) => {
      return (
        job.title.toLowerCase().includes(query) ||
        job.location.toLowerCase().includes(query) ||
        job.skills.some((skill) => skill.toLowerCase().includes(query))
      );
    });
  }, [companyJobs, jobsFilter]);

  const jobBeingEdited =
    editingJobId ? companyJobs.find((job) => job.id === editingJobId) ?? null : null;

  const resetJobForm = ({ clearEditing = true, clearSuccess = false } = {}) => {
    setJobForm(defaultFormState);
    setJobFormErrors({});
    setJobFormServerError(null);
    if (clearEditing) {
      setEditingJobId(null);
    }
    if (clearSuccess) {
      setJobFormSuccess(null);
    }
  };

  const handleJobFieldChange = (field: keyof JobFormState, value: string | boolean) => {
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
      skills: job.skills.join(", "),
    });
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
          skills: normalizeSkillsInput(jobForm.skills),
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
  <>
    <Header />
    <main className="flex min-h-screen flex-col bg-[var(--background)] text-white">
      {/* Top bar */}
      <div className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex w-full items-center justify-between gap-4 px-6 py-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--brandBlue)]/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              Company jobs
            </div>
            <h1 className="text-2xl font-semibold text-white">Manage job listings</h1>
            <p className="text-sm text-white/80">
              Review your open roles and publish new opportunities for students.
            </p>
          </div>
          <Link
            href="/dashboard/company"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-white/60 px-4 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Back to dashboard
          </Link>
        </div>
      </div>

      {/* Main grid – full width with BrandBlue accent */}
      <div className="flex w-full flex-1 flex-col gap-6 px-6 py-8">
        <div className="grid w-full gap-6 lg:grid-cols-[1.5fr,1fr] xl:grid-cols-[1.6fr,1fr]">
          {/* LEFT: Your job listings */}
          <section className="flex w-full flex-col gap-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Your job listings</h2>
                <p className="text-sm text-white/70">
                  {companyJobs.length === 0
                    ? "You haven't published any roles yet."
                    : `Managing ${companyJobs.length} job${
                        companyJobs.length === 1 ? "" : "s"
                      } visible to students.`}
                </p>
              </div>
              <div className="min-w-60">
                <Input
                  label="Filter jobs"
                  value={jobsFilter}
                  onChange={(event) => setJobsFilter(event.target.value)}
                  placeholder="Search by title, location, or skill..."
                  className="h-10 bg-[var(--brandBlue)]/10 text-white placeholder:text-white/60"
                  labelClassName="text-white"
                />
              </div>
            </header>

            {deleteError ? (
              <p className="text-sm text-red-500">{deleteError}</p>
            ) : null}
            {deleteSuccess ? (
              <p className="text-sm text-green-600">{deleteSuccess}</p>
            ) : null}

            <div className="mt-2">
              {isLoadingJobs ? (
                <p className="text-sm text-white/70">Loading job listings...</p>
              ) : jobsError ? (
                <p className="text-sm text-red-500">{jobsError}</p>
              ) : filteredJobs.length === 0 ? (
                <p className="text-sm text-white/70">
                  No jobs match this filter. Try adjusting your search.
                </p>
              ) : (
                <ul className="space-y-4">
                  {filteredJobs.map((job) => (
                    <li
                      key={job.id}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--brandBlue)]/5 px-4 py-3 shadow-sm transition hover:border-[var(--brandBlue)]/60 hover:shadow-md"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <h3 className="text-base font-semibold text-white">
                            {job.title}
                          </h3>
                          <p className="text-xs text-white/70">
                            {job.location} | {getJobTypeLabel(job.type)}{" "}
                            {job.remote ? "| Remote friendly" : ""}
                          </p>
                          <p className="text-xs text-white/60">
                            Posted {new Date(job.postedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            type="button"
                            className="btn-outline-brand !border-white/60! text-white! hover:bg-white/10"
                            onClick={() => handleSelectJobToEdit(job.id)}
                            disabled={isSubmitting && editingJobId === job.id}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            className="btn-outline-brand border-red-400! text-red-400! hover:bg-red-500/10"
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
                        <div className="mt-3 flex flex-wrap gap-2">
                          {job.skills.map((skill) => (
                            <span
                              key={`${job.id}-${skill}`}
                              className="rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/90"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* RIGHT: Post / edit job */}
          <section className="flex w-full flex-col gap-4 rounded-3xl border border-[var(--brandBlue)] bg-[var(--brandBlue)] p-6 text-white shadow-sm">
            <header className="space-y-1">
              <h2 className="text-lg font-semibold">
                {editingJobId ? "Edit job" : "Post a new job"}
              </h2>
              <p className="text-sm text-white/80">
                {editingJobId
                  ? "Update details for a role that students can already see."
                  : "Publish a new role and make it visible to students immediately."}
              </p>
              {editingJobId && jobBeingEdited ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-white bg-white/20 px-3 py-1 text-xs font-semibold text-white">
                  Editing: <span>{jobBeingEdited.title}</span>
                </div>
              ) : null}
            </header>

            <form className="mt-2 space-y-4" onSubmit={handleSubmitJob}>
              {jobFormServerError ? (
                <div className="rounded-lg border border-red-400 bg-red-500/5 px-3 py-2 text-sm text-red-600">
                  {jobFormServerError}
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  label="Job title"
                  value={jobForm.title}
                  onChange={(event) => handleJobFieldChange("title", event.target.value)}
                  placeholder="e.g. Product Designer"
                  className="border-white/40 bg-white/10 text-white placeholder:text-white/60"
                  labelClassName="text-white"
                  error={jobFormErrors.title}
                />
                <Input
                  label="Location"
                  value={jobForm.location}
                  onChange={(event) => handleJobFieldChange("location", event.target.value)}
                  placeholder="City, State or Remote"
                  className="border-white/40 bg-white/10 text-white placeholder:text-white/60"
                  labelClassName="text-white"
                  error={jobFormErrors.location}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-[1.3fr,auto]">
                <div className="space-y-1">
                  <label
                    htmlFor="job-type"
                    className="block text-sm font-medium text-white"
                  >
                    Job type
                  </label>
                  <select
                    id="job-type"
                    value={jobForm.type}
                    onChange={(event) =>
                      handleJobFieldChange("type", event.target.value as JobType)
                    }
                    className="h-10 w-full rounded-xl border border-white bg-white/10 px-3 text-sm text-white outline-none transition focus:border-white focus:ring-2 focus:ring-white/40"
                  >
                    {JOB_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value} className="text-black">
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {jobFormErrors.type ? (
                    <p className="text-xs text-red-500">{jobFormErrors.type}</p>
                  ) : null}
                </div>
                <label className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl border border-white bg-white/10 px-4 text-sm text-white md:mt-0">
                  <input
                    type="checkbox"
                    checked={jobForm.remote}
                    onChange={(event) =>
                      handleJobFieldChange("remote", event.target.checked)
                    }
                    className="h-4 w-4"
                  />
                  Remote friendly
                </label>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="job-description"
                  className="block text-sm font-medium text-white"
                >
                  Description
                </label>
                <textarea
                  id="job-description"
                  value={jobForm.description}
                  onChange={(event) => handleJobFieldChange("description", event.target.value)}
                  placeholder="Share the mission, responsibilities, and what success looks like..."
                  className="min-h-[140px] w-full rounded-xl border border-white/40 bg-white/10 px-3 py-2 text-sm text-white outline-none transition focus:border-white focus:ring-2 focus:ring-white/30"
                />
                {jobFormErrors.description ? (
                  <p className="text-xs text-red-500">{jobFormErrors.description}</p>
                ) : null}
              </div>

              <Input
                label="Key skills (comma separated)"
                value={jobForm.skills}
                onChange={(event) => handleJobFieldChange("skills", event.target.value)}
                placeholder="e.g. React, TypeScript, Figma"
                className="border-white/40 bg-white/10 text-white placeholder:text-white/60"
                labelClassName="text-white"
                error={jobFormErrors.skills}
              />
              <p className="text-xs text-white/80">
                Include 3-5 skills students should bring. We&apos;ll automatically remove duplicates.
              </p>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" className="btn-brand border border-white" isLoading={isSubmitting}>
                  {editingJobId ? "Update job" : "Publish job"}
                </Button>
              <Button
                type="button"
                className="btn-brand border border-white"
                onClick={() => resetJobForm({ clearEditing: true, clearSuccess: true })}
                disabled={isSubmitting}
              >
                Clear form
              </Button>
              </div>

              {jobFormSuccess ? (
                <p className="text-sm text-green-600">{jobFormSuccess}</p>
              ) : null}
            </form>
          </section>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {jobPendingDeletion ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-white">Delete job listing</h3>
            <p className="mt-2 text-sm text-white/80">
              Are you sure you want to remove this job? Students will no longer be able to view
              or apply once it is deleted.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                className="btn-outline-brand"
                onClick={() => {
                  setJobPendingDeletion(null);
                  setDeleteError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="btn-brand bg-red-500 hover:bg-red-500/90"
                onClick={handleDeleteJob}
                isLoading={jobPendingDeletion !== null && !deleteError && !deleteSuccess}
              >
                Delete job
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Footer />
    </main>
  </>
);
}
