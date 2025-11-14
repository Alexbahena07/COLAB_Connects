"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Header from "@/components/ui/Header";

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
            .map((job: any) => {
              if (!job || typeof job !== "object") return null;
              const { id, title, location, type, remote, description, postedAt, skills } = job;
              if (
                typeof id !== "string" ||
                typeof title !== "string" ||
                typeof location !== "string" ||
                typeof description !== "string"
              ) {
                return null;
              }
              return {
                id,
                title,
                location,
                type: coerceJobType(type),
                remote: Boolean(remote),
                description,
                postedAt:
                  typeof postedAt === "string"
                    ? postedAt
                    : postedAt instanceof Date
                    ? postedAt.toISOString()
                    : new Date(postedAt ?? Date.now()).toISOString(),
                skills: Array.isArray(skills)
                  ? skills.filter((skill: unknown): skill is string => typeof skill === "string")
                  : [],
              } satisfies CompanyJob;
            })
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

      const jobPayload = payload?.job;
      if (jobPayload && typeof jobPayload === "object") {
        setCompanyJobs((previous) => {
          const withoutCurrent = previous.filter((existing) => existing.id !== jobPayload.id);
          const nextJob: CompanyJob = {
            id: jobPayload.id,
            title: jobPayload.title,
            location: jobPayload.location,
            type: coerceJobType(jobPayload.type),
            remote: Boolean(jobPayload.remote),
            description: jobPayload.description,
            postedAt:
              typeof jobPayload.postedAt === "string"
                ? jobPayload.postedAt
                : new Date(jobPayload.postedAt ?? Date.now()).toISOString(),
            skills: Array.isArray(jobPayload.skills)
              ? jobPayload.skills.filter((skill: unknown): skill is string => typeof skill === "string")
              : [],
          };
          return [nextJob, ...withoutCurrent];
        });
      }

      const successMessage = (() => {
        if (typeof jobPayload?.title === "string") {
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
      <main className="flex min-h-screen flex-col bg-[--background] text-[--foreground]">
      <div className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto w-full max-w-6xl px-4 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-white">Manage job listings</h1>
              <p className="text-sm text-white/70">
                View, publish, and update the roles students see on the marketplace.
              </p>
            </div>
            <Link
              href="/dashboard/company"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white px-4 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6">
        <section className="rounded-xl border border-[--border] bg-[--surface] p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {editingJobId ? "Edit job" : "Post a new job"}
              </h2>
              <p className="text-sm text-white/70">
                {editingJobId
                  ? "Update the listing students can apply to."
                  : "Publish a new role to reach students immediately."}
              </p>
            </div>
            {editingJobId && jobBeingEdited ? (
              <div className="rounded-lg border border-[--brandBlue] bg-[--brandBlue]/10 px-3 py-2 text-xs text-white">
                Editing: <span className="font-semibold">{jobBeingEdited.title}</span>
              </div>
            ) : null}
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmitJob}>
            {jobFormServerError ? (
              <div className="rounded-lg border border-red-400 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {jobFormServerError}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Job title"
                value={jobForm.title}
                onChange={(event) => handleJobFieldChange("title", event.target.value)}
                placeholder="e.g. Product Designer"
                className="border-[--border] bg-[--background] text-[--foreground]"
                labelClassName="text-[--foreground]"
                error={jobFormErrors.title}
              />
              <Input
                label="Location"
                value={jobForm.location}
                onChange={(event) => handleJobFieldChange("location", event.target.value)}
                placeholder="City, State or Remote"
                className="border-[--border] bg-[--background] text-[--foreground]"
                labelClassName="text-[--foreground]"
                error={jobFormErrors.location}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="job-type" className="block text-sm font-medium text-[--foreground]">
                  Job type
                </label>
                <select
                  id="job-type"
                  value={jobForm.type}
                  onChange={(event) => handleJobFieldChange("type", event.target.value as JobType)}
                  className="h-11 w-full rounded-xl border border-[--border] bg-[--background] px-3 text-sm text-[--foreground] outline-none transition focus:border-[--brandBlue] focus:ring-2 focus:ring-[--brandBlue]/40"
                >
                  {JOB_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {jobFormErrors.type ? <p className="text-xs text-red-500">{jobFormErrors.type}</p> : null}
              </div>
              <label className="flex h-11 items-center gap-2 rounded-xl border border-[--border] bg-[--background] px-4 text-sm text-[--foreground]">
                <input
                  type="checkbox"
                  checked={jobForm.remote}
                  onChange={(event) => handleJobFieldChange("remote", event.target.checked)}
                  className="h-4 w-4"
                />
                Remote friendly role
              </label>
            </div>

            <div className="space-y-1">
              <label htmlFor="job-description" className="block text-sm font-medium text-[--foreground]">
                Description
              </label>
              <textarea
                id="job-description"
                value={jobForm.description}
                onChange={(event) => handleJobFieldChange("description", event.target.value)}
                placeholder="Share the mission, responsibilities, and what success looks like..."
                className="min-h-[140px] w-full rounded-xl border border-[--border] bg-[--background] px-3 py-2 text-sm text-[--foreground] outline-none transition focus:border-[--brandBlue] focus:ring-2 focus:ring-[--brandBlue]/40"
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
              className="border-[--border] bg-[--background] text-[--foreground]"
              labelClassName="text-[--foreground]"
              error={jobFormErrors.skills}
            />
            <p className="text-xs text-[--foreground]/70">
              Include the top 3-5 skills students should bring. We'll remove duplicates automatically.
            </p>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" className="btn-brand" isLoading={isSubmitting}>
                {editingJobId ? "Update job" : "Publish job"}
              </Button>
              <Button
                type="button"
                className="btn-outline-brand"
                onClick={() => resetJobForm({ clearEditing: true, clearSuccess: true })}
                disabled={isSubmitting}
              >
                Clear form
              </Button>
            </div>
            {jobFormSuccess ? (
              <p className="text-sm text-green-400">{jobFormSuccess}</p>
            ) : null}
          </form>
        </section>

        <section className="rounded-xl border border-[--border] bg-[--surface] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Your job listings</h2>
              <p className="text-sm text-white/70">
                {companyJobs.length === 0
                  ? "You haven't published any roles yet."
                  : `Managing ${companyJobs.length} job${companyJobs.length === 1 ? "" : "s"}.`}
              </p>
            </div>
            <Input
              label="Filter jobs"
              value={jobsFilter}
              onChange={(event) => setJobsFilter(event.target.value)}
              placeholder="Search by title, location, or skill..."
              className="h-11 min-w-[240px] bg-[--background] text-[--foreground]"
              labelClassName="text-white"
            />
          </div>
          {deleteError ? (
            <p className="mt-3 text-sm text-red-300">{deleteError}</p>
          ) : null}
          {deleteSuccess ? (
            <p className="mt-3 text-sm text-green-300">{deleteSuccess}</p>
          ) : null}

          {isLoadingJobs ? (
            <p className="mt-6 text-sm text-white/70">Loading job listings...</p>
          ) : jobsError ? (
            <p className="mt-6 text-sm text-red-300">{jobsError}</p>
          ) : filteredJobs.length === 0 ? (
            <p className="mt-6 text-sm text-white/70">No jobs match this filter.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {filteredJobs.map((job) => (
                <li key={job.id} className="rounded-xl border border-[--border] bg-[--background] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-[--foreground]">{job.title}</h3>
                      <p className="text-xs text-[--foreground]/70">
                        {job.location} • {getJobTypeLabel(job.type)} {job.remote ? "• Remote friendly" : ""}
                      </p>
                      <p className="mt-1 text-xs text-[--foreground]/60">
                        Posted {new Date(job.postedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        className="btn-outline-brand border-white text-white hover:bg-white/10"
                        onClick={() => handleSelectJobToEdit(job.id)}
                        disabled={isSubmitting && editingJobId === job.id}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        className="btn-outline-brand border-red-400 text-red-200 hover:bg-red-500/10"
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
                          className="rounded-xl border border-[--border] px-2 py-1 text-[10px] uppercase tracking-wide text-[--foreground]/80"
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
        </section>
      </div>
      {jobPendingDeletion ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-xl border border-[--border] bg-[--surface] p-6">
            <h3 className="text-lg font-semibold text-white">Delete job listing</h3>
            <p className="mt-2 text-sm text-white/70">
              Are you sure you want to remove this job? Students will no longer be able to view or apply once it is
              deleted.
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
      </main>
    </>
  );
}
