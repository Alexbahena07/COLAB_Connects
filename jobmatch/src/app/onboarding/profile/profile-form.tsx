"use client";

import { useForm, useFieldArray, Controller } from "react-hook-form";
import { useEffect, useState, useRef, type ChangeEvent } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Autocomplete from "@/components/ui/Autocomplete";
import { useRouter } from "next/navigation";
import { CITY_OPTIONS, SCHOOL_OPTIONS, SKILL_OPTIONS } from "./options";

// Zod schema (all optional; removed skill level)
const FormSchema = z.object({
  profile: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    headline: z.string().optional(),
    desiredLocation: z.string().optional(),
  }).optional(),

  degrees: z.array(
    z.object({
      school: z.string().optional(),
      degree: z.string().optional(),
      field: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).superRefine((val, ctx) => {
      if (val.startDate && val.endDate && new Date(val.startDate) > new Date(val.endDate)) {
        ctx.addIssue({ code: "custom", message: "Start must be before end", path: ["endDate"] });
      }
    })
  ).optional(),

  certificates: z.array(
    z.object({
      name: z.string().optional(),
      issuer: z.string().optional(),
      issuedAt: z.string().optional(),
      credentialId: z.string().optional(),
      credentialUrl: z.string().optional(),
    })
  ).optional(),

  experiences: z.array(
    z.object({
      title: z.string().optional(),
      company: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      description: z.string().optional(),
    }).superRefine((val, ctx) => {
      if (val.startDate && val.endDate && new Date(val.startDate) > new Date(val.endDate)) {
        ctx.addIssue({ code: "custom", message: "Start must be before end", path: ["endDate"] });
      }
    })
  ).optional(),

  skills: z.array(
    z.object({
      name: z.string().optional(),
      years: z.coerce.number().int().min(0).max(50).optional(),
    })
  ).optional(),
});

type FormData = z.infer<typeof FormSchema>;

type ProfileFormProps = {
  redirectTo?: string;
};

type ResumeMetadata = {
  fileName: string;
  fileType?: string | null;
} | null;

const DEFAULT_VALUES: FormData = {
  profile: { firstName: "", lastName: "", headline: "", desiredLocation: "" },
  degrees: [],
  certificates: [],
  experiences: [],
  skills: [],
};

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("Unable to read file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

const MAX_RESUME_BYTES = 5 * 1024 * 1024; // 5MB

type ProfileResponse = {
  profile?: Partial<NonNullable<FormData["profile"]>>;
  degrees?: Array<{
    school?: string;
    degree?: string;
    field?: string;
    startDate?: string;
    endDate?: string;
  }>;
  certificates?: Array<{
    name?: string;
    issuer?: string;
    issuedAt?: string;
    credentialId?: string;
    credentialUrl?: string;
  }>;
  experiences?: Array<{
    title?: string;
    company?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  skills?: Array<{ name?: string; years?: number | null }>;
  resume?: { fileName?: string; fileType?: string | null } | null;
};

export default function ProfileForm({ redirectTo = "/dashboard" }: ProfileFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [storedResume, setStoredResume] = useState<ResumeMetadata>(null);
  const [existingResume, setExistingResume] = useState<ResumeMetadata>(null);
  const [pendingResumeRemoval, setPendingResumeRemoval] = useState(false);
  const resumeInputRef = useRef<HTMLInputElement | null>(null);

  const { register, control, handleSubmit, formState: { isSubmitting }, reset } =
    useForm<FormData>({
      resolver: zodResolver(FormSchema),
      defaultValues: DEFAULT_VALUES,
    });

  const deg = useFieldArray({ control, name: "degrees" });
  const cert = useFieldArray({ control, name: "certificates" });
  const exp = useFieldArray({ control, name: "experiences" });
  const skl = useFieldArray({ control, name: "skills" });

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        if (!res.ok) {
          throw new Error("Failed to load profile");
        }
        const data: ProfileResponse = await res.json();
        if (!active) return;
        const normalised: FormData = {
          profile: { ...DEFAULT_VALUES.profile, ...(data?.profile ?? {}) },
          degrees: Array.isArray(data?.degrees) ? data.degrees : [],
          certificates: Array.isArray(data?.certificates) ? data.certificates : [],
          experiences: Array.isArray(data?.experiences) ? data.experiences : [],
          skills: Array.isArray(data?.skills)
            ? data.skills.map((item) => {
                const name = item?.name ?? "";
                const years =
                  typeof item?.years === "number" && !Number.isNaN(item.years)
                    ? item.years
                    : undefined;
                return years !== undefined ? { name, years } : { name };
              })
            : [],
        };
        reset(normalised);
        setLoadError(null);
        const resumeMeta =
          data?.resume && typeof data.resume === "object" && data.resume?.fileName
            ? {
                fileName: data.resume.fileName,
                fileType: data.resume.fileType ?? "application/pdf",
              }
            : null;
        setStoredResume(resumeMeta);
        setExistingResume(resumeMeta);
        setPendingResumeRemoval(false);
        setResumeFile(null);
        setResumeError(null);
      } catch (error) {
        console.error(error);
        setLoadError("We couldn't load your saved profile. You can still make updates below.");
        reset(DEFAULT_VALUES);
        setStoredResume(null);
        setExistingResume(null);
        setPendingResumeRemoval(false);
        setResumeFile(null);
        setResumeError(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [reset]);

  const clearResumeInput = () => {
    if (resumeInputRef.current) {
      resumeInputRef.current.value = "";
    }
  };

  const handleResumeChange = (event: ChangeEvent<HTMLInputElement>) => {
    setResumeError(null);
    const files = event.target.files;
    if (!files || files.length === 0) {
      setResumeFile(null);
      if (!existingResume) {
        setResumeError("Please upload your resume as a PDF.");
      }
      return;
    }
    const file = files.item(0);
    if (!file) {
      setResumeFile(null);
      return;
    }
    const mime = file.type?.toLowerCase() ?? "";
    const isPdf =
      mime.includes("pdf") || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setResumeFile(null);
      setResumeError("Upload your resume as a PDF file.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_RESUME_BYTES) {
      setResumeFile(null);
      setResumeError("PDF must be 5MB or smaller.");
      event.target.value = "";
      return;
    }
    setResumeFile(file);
  };

  const markResumeForRemoval = () => {
    setPendingResumeRemoval(true);
    setExistingResume(null);
    setResumeFile(null);
    setResumeError("Upload a new resume to finish removal.");
    clearResumeInput();
  };

  const cancelResumeRemoval = () => {
    setPendingResumeRemoval(false);
    setExistingResume(storedResume);
    setResumeFile(null);
    setResumeError(null);
    clearResumeInput();
  };

  const formDisabled = loading || isSubmitting;

  const onSubmit = async (data: FormData) => {
    if (loading) return;

    setResumeError(null);
    if (pendingResumeRemoval && !resumeFile) {
      setResumeError("Upload a new resume before removing the current one.");
      return;
    }
    if (!resumeFile && !existingResume) {
      setResumeError("Please upload your resume as a PDF before continuing.");
      return;
    }

    let resumePayload: { fileName: string; fileType: string; dataUrl: string } | null = null;
    if (resumeFile) {
      try {
        const dataUrl = await fileToDataUrl(resumeFile);
        resumePayload = {
          fileName: resumeFile.name,
          fileType: resumeFile.type || "application/pdf",
          dataUrl,
        };
      } catch (error) {
        console.error(error);
        setResumeError("We couldn't read that PDF. Try uploading it again.");
        return;
      }
    }

    const stripEmpty = <T extends Record<string, unknown>>(rows: T[] | undefined) =>
      (rows ?? []).filter((r) => Object.values(r).some((v) => v !== "" && v !== undefined && v !== null));

    const payload: Record<string, unknown> = {
      profile: data.profile,
      degrees: stripEmpty(data.degrees),
      certificates: stripEmpty(data.certificates),
      experiences: stripEmpty(data.experiences),
      skills: stripEmpty(data.skills),
    };
    if (resumePayload) {
      payload.resume = resumePayload;
    }

    const res = await fetch("/api/profile/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) router.push(redirectTo);
    else alert("Failed to save profile");
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
      {loadError ? (
        <p className="rounded-lg border border-yellow-400 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">{loadError}</p>
      ) : null}

      {loading ? (
        <p className="rounded-lg border border-[--border] bg-[--surface] px-3 py-2 text-sm opacity-80">Loading saved profile...</p>
      ) : null}

      {/* Basic Profile */}
      <section className="rounded-xl border border-gray-200 p-4">
        <h2 className="font-medium mb-3">Basic Info</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Input label="First name" {...register("profile.firstName")} />
          <Input label="Last name" {...register("profile.lastName")} />
          <Input label="Headline" placeholder="e.g., Full‑stack Engineer" {...register("profile.headline")} />

          {/* Desired work location with Autocomplete */}
          <Controller
            control={control}
            name="profile.desiredLocation"
            render={({ field }) => (
              <Autocomplete
                label="Desired work location"
                value={field.value || ""}
                onChange={field.onChange}
                placeholder="Start typing a city…"
                options={CITY_OPTIONS}
              />
            )}
          />
        </div>
      </section>

      {/* Resume upload */}
      <section className="rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-medium">Resume (PDF)</h2>
            <p className="text-sm text-gray-600">Upload a PDF of your resume (max 5MB). Required for students.</p>
          </div>
          {existingResume ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-green-700">On file: {existingResume.fileName}</span>
              <button
                type="button"
                onClick={markResumeForRemoval}
                className="rounded-md border border-red-600 px-2 py-1 font-semibold text-red-600 hover:bg-red-50"
              >
                Remove resume
              </button>
            </div>
          ) : storedResume && pendingResumeRemoval ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-red-600">Removal pending — upload a new PDF to finish.</span>
              <button
                type="button"
                onClick={cancelResumeRemoval}
                className="rounded-md border border-[--brand] px-2 py-1 font-semibold text-[--brand] hover:bg-[--background]/20"
              >
                Keep current resume
              </button>
            </div>
          ) : (
            <span className="text-xs font-semibold text-[--brand]">Required</span>
          )}
        </div>
        <div className="mt-4 space-y-2">
          <label
            htmlFor="resume-upload"
            className="flex cursor-pointer items-center justify-between rounded-lg border border-dashed border-[--border] bg-[--surface] px-4 py-3 text-sm font-semibold text-[--brand] hover:bg-[--background]/40"
          >
            <span>{resumeFile ? "Replace selected PDF" : "Upload PDF"}</span>
            <span className="text-xs font-normal text-[--foreground]/70">Max 5MB</span>
          </label>
          <input
            id="resume-upload"
            type="file"
            accept="application/pdf"
            className="hidden"
            ref={resumeInputRef}
            onChange={handleResumeChange}
            disabled={formDisabled}
          />
          {resumeFile ? (
            <p className="text-xs text-[--foreground]">Selected file: {resumeFile.name}</p>
          ) : pendingResumeRemoval && storedResume ? (
            <p className="text-xs text-[--foreground]/80">Resume removal pending. Choose a PDF above to replace it.</p>
          ) : existingResume ? (
            <p className="text-xs text-[--foreground]/80">Current resume: {existingResume.fileName}</p>
          ) : (
            <p className="text-xs text-[--foreground]/80">No resume uploaded yet.</p>
          )}
          {resumeError ? <p className="text-xs text-red-600">{resumeError}</p> : null}
        </div>
      </section>

      {/* Degrees */}
      <section className="rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Degrees</h2>
          <button type="button" className="text-sm rounded-lg border px-3 py-1 hover:bg-gray-50"
            onClick={() => deg.append({ school: "", degree: "", field: "", startDate: "", endDate: "" })}>
            Add degree
          </button>
        </div>
        <div className="space-y-4">
          {deg.fields.map((f, i) => (
            <div key={f.id} className="grid gap-3 md:grid-cols-5">
              {/* School with Autocomplete */}
              <Controller
                control={control}
                name={`degrees.${i}.school` as const}
                render={({ field }) => (
                  <Autocomplete
                    label="School"
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="Start typing a school…"
                    options={SCHOOL_OPTIONS}
                  />
                )}
              />
              <Input label="Degree" {...register(`degrees.${i}.degree` as const)} />
              <Input label="Field" {...register(`degrees.${i}.field` as const)} />
              <Input label="Start" type="date" {...register(`degrees.${i}.startDate` as const)} />
              <Input label="End" type="date" {...register(`degrees.${i}.endDate` as const)} />
              <div className="md:col-span-5">
                <button type="button" className="text-xs text-red-600" onClick={() => deg.remove(i)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Certificates (unchanged inputs) */}
      <section className="rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Certificates</h2>
          <button type="button" className="text-sm rounded-lg border px-3 py-1 hover:bg-gray-50"
            onClick={() => cert.append({ name: "", issuer: "", issuedAt: "", credentialId: "", credentialUrl: "" })}>
            Add certificate
          </button>
        </div>
        <div className="space-y-4">
          {cert.fields.map((f, i) => (
            <div key={f.id} className="grid gap-3 md:grid-cols-5">
              <Input label="Name" {...register(`certificates.${i}.name` as const)} />
              <Input label="Issuer" {...register(`certificates.${i}.issuer` as const)} />
              <Input label="Issued" type="date" {...register(`certificates.${i}.issuedAt` as const)} />
              <Input label="Cred. ID" {...register(`certificates.${i}.credentialId` as const)} />
              <Input label="URL" type="url" {...register(`certificates.${i}.credentialUrl` as const)} />
              <div className="md:col-span-5">
                <button type="button" className="text-xs text-red-600" onClick={() => cert.remove(i)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Experience (unchanged) */}
      <section className="rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Work history</h2>
          <button type="button" className="text-sm rounded-lg border px-3 py-1 hover:bg-gray-50"
            onClick={() => exp.append({ title: "", company: "", startDate: "", endDate: "", description: "" })}>
            Add role
          </button>
        </div>
        <div className="space-y-4">
          {exp.fields.map((f, i) => (
            <div key={f.id} className="grid gap-3 md:grid-cols-5">
              <Input label="Title" {...register(`experiences.${i}.title` as const)} />
              <Input label="Company" {...register(`experiences.${i}.company` as const)} />
              <Input label="Start" type="date" {...register(`experiences.${i}.startDate` as const)} />
              <Input label="End" type="date" {...register(`experiences.${i}.endDate` as const)} />
              <Input label="Description" className="md:col-span-5" {...register(`experiences.${i}.description` as const)} />
              <div className="md:col-span-5">
                <button type="button" className="text-xs text-red-600" onClick={() => exp.remove(i)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Skills with Autocomplete (no level) */}
      <section className="rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Skills</h2>
          <button type="button" className="text-sm rounded-lg border px-3 py-1 hover:bg-gray-50"
            onClick={() => skl.append({ name: "", years: undefined })}>
            Add skill
          </button>
        </div>
        <div className="space-y-4">
          {skl.fields.map((f, i) => (
            <div key={f.id} className="grid gap-3 md:grid-cols-3">
              <Controller
                control={control}
                name={`skills.${i}.name` as const}
                render={({ field }) => (
                  <Autocomplete
                    label="Skill"
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="Start typing a skill…"
                    options={SKILL_OPTIONS}
                  />
                )}
              />
              <Input label="Years" type="number" min={0} max={50} {...register(`skills.${i}.years` as const)} />
              <div className="md:col-span-3">
                <button type="button" className="text-xs text-red-600" onClick={() => skl.remove(i)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <Button type="submit" isLoading={formDisabled} disabled={formDisabled} className="bg-[--brand] text-white">
          Save and continue
        </Button>
      </div>
    </form>
  );
}
