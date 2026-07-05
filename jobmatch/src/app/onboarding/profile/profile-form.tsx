"use client";

import { useForm, useFieldArray, Controller } from "react-hook-form";
import { useEffect, useState, useRef, type ChangeEvent } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Autocomplete from "@/components/ui/Autocomplete";
import AvatarCropperDialog from "@/components/ui/AvatarCropperDialog";
import { useRouter } from "next/navigation";
import { CITY_OPTIONS, SCHOOL_OPTIONS, SKILL_OPTIONS } from "./options";

// Zod schema (all optional; removed skill level)
const FormSchema = z.object({
  profile: z
    .object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      headline: z.string().optional(),
      desiredLocation: z.string().optional(),
    })
    .optional(),

  degrees: z
    .array(
      z
        .object({
          school: z.string().optional(),
          degree: z.string().optional(),
          field: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
        .superRefine((val, ctx) => {
          if (val.startDate && val.endDate && new Date(val.startDate) > new Date(val.endDate)) {
            ctx.addIssue({ code: "custom", message: "Start must be before end", path: ["endDate"] });
          }
        })
    )
    .optional(),

  certificates: z
    .array(
      z.object({
        name: z.string().optional(),
        issuer: z.string().optional(),
        issuedAt: z.string().optional(),
        credentialId: z.string().optional(),
        credentialUrl: z.string().optional(),
      })
    )
    .optional(),

  experiences: z
    .array(
      z
        .object({
          title: z.string().optional(),
          company: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          description: z.string().optional(),
        })
        .superRefine((val, ctx) => {
          if (val.startDate && val.endDate && new Date(val.startDate) > new Date(val.endDate)) {
            ctx.addIssue({ code: "custom", message: "Start must be before end", path: ["endDate"] });
          }
        })
    )
    .optional(),

  skills: z
    .array(
      z.object({
        name: z.string().optional(),
        years: z.coerce.number().int().min(0).max(50).optional(),
      })
    )
    .optional(),
});

type FormData = z.infer<typeof FormSchema>;

type ProfileFormProps = {
  redirectTo?: string;
  isEmbedded?: boolean;
};

type ResumeMetadata =
  | {
      fileName: string;
      fileType?: string | null;
    }
  | null;

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2MB
const MAX_RESUME_BYTES = 5 * 1024 * 1024; // 5MB

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
      if (typeof result === "string") resolve(result);
      else reject(new Error("Unable to read file"));
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

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
  avatarUrl?: string | null;
};

export default function ProfileForm({ redirectTo = "/dashboard", isEmbedded = false }: ProfileFormProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [storedResume, setStoredResume] = useState<ResumeMetadata>(null);
  const [existingResume, setExistingResume] = useState<ResumeMetadata>(null);
  const [pendingResumeRemoval, setPendingResumeRemoval] = useState(false);
  const resumeInputRef = useRef<HTMLInputElement | null>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [editorImageSrc, setEditorImageSrc] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [croppedAvatarDataUrl, setCroppedAvatarDataUrl] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { isSubmitting },
    reset,
  } = useForm<FormData>({
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
        if (!res.ok) throw new Error("Failed to load profile");

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
                  typeof item?.years === "number" && !Number.isNaN(item.years) ? item.years : undefined;
                return years !== undefined ? { name, years } : { name };
              })
            : [],
        };

        reset(normalised);
        setLoadError(null);

        const resumeMeta =
          data?.resume && typeof data.resume === "object" && data.resume?.fileName
            ? { fileName: data.resume.fileName, fileType: data.resume.fileType ?? "application/pdf" }
            : null;

        setStoredResume(resumeMeta);
        setExistingResume(resumeMeta);
        setPendingResumeRemoval(false);
        setResumeFile(null);
        setResumeError(null);

        setAvatarUrl(typeof data?.avatarUrl === "string" ? data.avatarUrl : null);
        setAvatarError(null);
        setEditorImageSrc(null);
        setIsEditorOpen(false);
        setCroppedAvatarDataUrl(null);
      } catch (error) {
        console.error(error);
        setLoadError("We couldn't load your saved profile. You can still make updates below.");
        reset(DEFAULT_VALUES);

        setStoredResume(null);
        setExistingResume(null);
        setPendingResumeRemoval(false);
        setResumeFile(null);
        setResumeError(null);

        setAvatarUrl(null);
        setAvatarError(null);
        setEditorImageSrc(null);
        setIsEditorOpen(false);
        setCroppedAvatarDataUrl(null);
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
    if (resumeInputRef.current) resumeInputRef.current.value = "";
  };

  const clearAvatarInput = () => {
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  const handleResumeChange = (event: ChangeEvent<HTMLInputElement>) => {
    setResumeError(null);
    const files = event.target.files;

    if (!files || files.length === 0) {
      setResumeFile(null);
      if (!existingResume) setResumeError("Please upload your resume as a PDF.");
      return;
    }

    const file = files.item(0);
    if (!file) {
      setResumeFile(null);
      return;
    }

    const mime = file.type?.toLowerCase() ?? "";
    const isPdf = mime.includes("pdf") || file.name.toLowerCase().endsWith(".pdf");
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

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    setAvatarError(null);
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files.item(0);
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAvatarError("Upload a JPG or PNG image.");
      clearAvatarInput();
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError("Profile photo must be 2MB or smaller.");
      clearAvatarInput();
      return;
    }

    const dataUrl = await fileToDataUrl(file);
    setEditorImageSrc(dataUrl);
    setIsEditorOpen(true);
    clearAvatarInput();
  };

  const handleAvatarSave = ({ dataUrl }: { blob: Blob; dataUrl: string }) => {
    setCroppedAvatarDataUrl(dataUrl);
    setAvatarUrl(dataUrl);
    setIsEditorOpen(false);
    setEditorImageSrc(null);
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
    setAvatarError(null);

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

    if (croppedAvatarDataUrl) {
      payload.avatar = { dataUrl: croppedAvatarDataUrl };
    }

    if (resumePayload) payload.resume = resumePayload;

    const res = await fetch("/api/profile/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) router.push(redirectTo);
    else alert("Failed to save profile");
  };

  const formBody = (
    <>
      {/* Status banners */}
      {loadError ? (
        <div className="mb-6 rounded-2xl border border-yellow-400 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          {loadError}
        </div>
      ) : null}

      {loading ? (
        <div className="mb-6 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          Loading saved profile...
        </div>
      ) : null}

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Basic Profile */}
          <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm ring-1 ring-black/5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-brand">
                  Basic info
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Add a headline, location, and a professional photo.
                </p>
              </div>

              
            </div>

            <div className={`mt-6 grid gap-6 ${isEmbedded ? "" : "lg:grid-cols-[360px_1fr]"}`}>
              {/* Avatar card */}
              <div className="rounded-3xl border border-white/10 bg-brand p-5 ring-1 ring-white/10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Profile photo</p>
                    <p className="mt-1 text-xs text-white/70">
                      Upload a photo and crop it to look your best.
                    </p>
                  </div>
                  {avatarUrl ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarUrl(null);
                        setCroppedAvatarDataUrl(null);
                      }}
                      className="rounded-xl border border-white/25 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-5">
                  {/* Preview */}
                  <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-white/25 bg-white/5 shadow-sm ring-2 ring-white/10">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Profile preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-white/50">
                        No photo
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3">
                    <label
                      htmlFor="avatar-upload"
                      className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-brandBlue px-4 py-2 text-xs font-semibold text-white hover:opacity-95"
                    >
                      Choose photo
                    </label>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={avatarInputRef}
                      onChange={handleAvatarChange}
                      disabled={formDisabled}
                    />
                    <p className="text-xs text-white/60">JPG or PNG · max 2 MB</p>
                    {avatarError ? <p className="text-xs text-red-400">{avatarError}</p> : null}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70">
                  We recommend a clean headshot with good lighting.
                </div>
              </div>

              {/* Profile fields */}
              <div className="rounded-3xl border border-border bg-surface p-5 ring-1 ring-black/5">
                <div className={`grid gap-4 ${isEmbedded ? "grid-cols-2" : "md:grid-cols-3"}`}>
                  <Input
                    label="First name"
                    labelClassName="text-foreground"
                    className="border-border bg-background text-foreground placeholder:text-muted"
                    {...register("profile.firstName")}
                  />

                  <Input
                    label="Last name"
                    labelClassName="text-foreground"
                    className="border-border bg-background text-foreground placeholder:text-muted"
                    {...register("profile.lastName")}
                  />

                  <Input
                    label="Headline"
                    placeholder="e.g., Financial Analyst • FP&A • SQL"
                    labelClassName="text-foreground"
                    className={`border-border bg-background text-foreground placeholder:text-muted ${isEmbedded ? "col-span-2" : ""}`}
                    {...register("profile.headline")}
                  />

                  {/* Desired work location with Autocomplete */}
                  <div className={isEmbedded ? "col-span-2" : "md:col-span-3"}>
                    <Controller
                      control={control}
                      name="profile.desiredLocation"
                      render={({ field }) => (
                        <Autocomplete
                          label="Desired work location"
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder="Start typing a city"
                          options={CITY_OPTIONS}
                          labelClassName="text-foreground"
                          inputClassName="border-border bg-background text-foreground placeholder:text-muted"
                          panelClassName="border-border bg-surface"
                          optionClassName="text-foreground hover:bg-surface"
                        />
                      )}
                    />
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-brandBlue/20 bg-brandBlue/5 px-4 py-3 text-xs text-foreground/70">
                  Your headline is what recruiters scan first—lead with role + tools (ex: "Analyst • Excel • SQL").
                </div>
              </div>
            </div>
          </section>

          {/* Resume upload */}
          <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm ring-1 ring-black/5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-brand">Resume (PDF)</h2>
                <p className="mt-1 text-sm text-muted">Upload a PDF (max 5 MB). Required for students.</p>
              </div>

              {existingResume ? (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 font-semibold text-emerald-200">
                    On file: {existingResume.fileName}
                  </span>
                  <button
                    type="button"
                    onClick={markResumeForRemoval}
                    className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 font-semibold text-red-700 hover:bg-red-100"
                  >
                    Remove
                  </button>
                </div>
              ) : storedResume && pendingResumeRemoval ? (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-red-300 bg-red-50 px-3 py-1 font-semibold text-red-700">
                    Removal pending — upload a new PDF to finish.
                  </span>
                  <button
                    type="button"
                    onClick={cancelResumeRemoval}
                    className="rounded-xl border border-border bg-surface px-3 py-2 font-semibold text-foreground hover:bg-border/50"
                  >
                    Keep current
                  </button>
                </div>
              ) : (
                <span className="rounded-full bg-brandBlue/10 px-3 py-1 text-xs font-semibold text-brandBlue">
                  Required
                </span>
              )}
            </div>

            <div className="mt-5 space-y-2">
              <label
                htmlFor="resume-upload"
                className="flex cursor-pointer items-center justify-between rounded-2xl border border-dashed border-border bg-surface px-4 py-4 text-sm font-semibold text-foreground hover:border-brand/40 hover:bg-surface"
              >
                <span>{resumeFile ? "Replace selected PDF" : "Upload PDF"}</span>
                <span className="text-xs font-normal text-muted">Max 5 MB</span>
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
                <p className="text-xs text-muted">Selected file: {resumeFile.name}</p>
              ) : pendingResumeRemoval && storedResume ? (
                <p className="text-xs text-muted">Resume removal pending. Choose a PDF above to replace it.</p>
              ) : existingResume ? (
                <p className="text-xs text-muted">Current resume: {existingResume.fileName}</p>
              ) : (
                <p className="text-xs text-muted">No resume uploaded yet.</p>
              )}

              {resumeError ? <p className="text-xs text-red-400">{resumeError}</p> : null}
            </div>
          </section>

          {/* Reusable section shell */}
          {/*
            For the repeating lists, we keep:
            - same card styling
            - brandBlue as the add button
            - subtle separators for readability
          */}

          {/* Degrees */}
          <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm ring-1 ring-black/5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-brand">Degrees</h2>
                <p className="mt-1 text-sm text-muted">Add education history. Keep it clean and scannable.</p>
              </div>
              <button
                type="button"
                className="rounded-xl bg-brandBlue px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
                onClick={() => deg.append({ school: "", degree: "", field: "", startDate: "", endDate: "" })}
              >
                Add degree
              </button>
            </div>

            <div className="mt-5 space-y-5">
              {deg.fields.length === 0 ? (
                <div className="rounded-2xl border border-border bg-surface px-4 py-4 text-sm text-muted">
                  No degrees yet. Add one to help employers understand your background.
                </div>
              ) : null}

              {deg.fields.map((f, i) => (
                <div key={f.id} className="rounded-3xl border border-border bg-surface p-5">
                  <div className="grid gap-3 md:grid-cols-5">
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
                          labelClassName="text-foreground"
                          inputClassName="border-border bg-background text-foreground placeholder:text-muted"
                          panelClassName="border-border bg-surface"
                          optionClassName="text-foreground hover:bg-surface"
                        />
                      )}
                    />

                    <Input
                      label="Degree"
                      labelClassName="text-foreground"
                      className="border-border bg-background text-foreground placeholder:text-muted"
                      {...register(`degrees.${i}.degree` as const)}
                    />
                    <Input
                      label="Field"
                      labelClassName="text-foreground"
                      className="border-border bg-background text-foreground placeholder:text-muted"
                      {...register(`degrees.${i}.field` as const)}
                    />
                    <Input
                      label="Start"
                      type="date"
                      labelClassName="text-foreground"
                      className="border-border bg-background text-foreground"
                      {...register(`degrees.${i}.startDate` as const)}
                    />
                    <Input
                      label="End"
                      type="date"
                      labelClassName="text-foreground"
                      className="border-border bg-background text-foreground"
                      {...register(`degrees.${i}.endDate` as const)}
                    />

                    <div className="md:col-span-5">
                      <button
                        type="button"
                        className="text-xs font-semibold text-red-600 hover:text-red-700"
                        onClick={() => deg.remove(i)}
                      >
                        Remove degree
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Certificates */}
          <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm ring-1 ring-black/5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-brand">Certificates</h2>
                <p className="mt-1 text-sm text-muted">Add credentials that strengthen your story.</p>
              </div>
              <button
                type="button"
                className="rounded-xl bg-brandBlue px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
                onClick={() => cert.append({ name: "", issuer: "", issuedAt: "", credentialId: "", credentialUrl: "" })}
              >
                Add certificate
              </button>
            </div>

            <div className="mt-5 space-y-5">
              {cert.fields.length === 0 ? (
                <div className="rounded-2xl border border-border bg-surface px-4 py-4 text-sm text-muted">
                  No certificates yet. Add one if it's relevant (Bloomberg, CPA track, Coursera, etc.).
                </div>
              ) : null}

              {cert.fields.map((f, i) => (
                <div key={f.id} className="rounded-3xl border border-border bg-surface p-5">
                  <div className="grid gap-3 md:grid-cols-5">
                    <Input
                      label="Name"
                      labelClassName="text-foreground"
                      className="border-border bg-background text-foreground placeholder:text-muted"
                      {...register(`certificates.${i}.name` as const)}
                    />
                    <Input
                      label="Issuer"
                      labelClassName="text-foreground"
                      className="border-border bg-background text-foreground placeholder:text-muted"
                      {...register(`certificates.${i}.issuer` as const)}
                    />
                    <Input
                      label="Issued"
                      type="date"
                      labelClassName="text-foreground"
                      className="border-border bg-background text-foreground"
                      {...register(`certificates.${i}.issuedAt` as const)}
                    />
                    <Input
                      label="Cred. ID"
                      labelClassName="text-foreground"
                      className="border-border bg-background text-foreground placeholder:text-muted"
                      {...register(`certificates.${i}.credentialId` as const)}
                    />
                    <Input
                      label="URL"
                      type="url"
                      labelClassName="text-foreground"
                      className="border-border bg-background text-foreground placeholder:text-muted"
                      {...register(`certificates.${i}.credentialUrl` as const)}
                    />

                    <div className="md:col-span-5">
                      <button
                        type="button"
                        className="text-xs font-semibold text-red-600 hover:text-red-700"
                        onClick={() => cert.remove(i)}
                      >
                        Remove certificate
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Work history */}
          <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm ring-1 ring-black/5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-brand">Work history</h2>
                <p className="mt-1 text-sm text-muted">Highlight internships, projects, and roles.</p>
              </div>
              <button
                type="button"
                className="rounded-xl bg-brandBlue px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
                onClick={() => exp.append({ title: "", company: "", startDate: "", endDate: "", description: "" })}
              >
                Add role
              </button>
            </div>

            <div className="mt-5 space-y-5">
              {exp.fields.length === 0 ? (
                <div className="rounded-2xl border border-border bg-surface px-4 py-4 text-sm text-muted">
                  No roles yet. Add your most relevant experience first.
                </div>
              ) : null}

              {exp.fields.map((f, i) => (
                <div key={f.id} className="rounded-3xl border border-border bg-surface p-5">
                  <div className="grid gap-3 md:grid-cols-5">
                    <Input
                      label="Title"
                      labelClassName="text-foreground"
                      className="border-border bg-background text-foreground placeholder:text-muted"
                      {...register(`experiences.${i}.title` as const)}
                    />
                    <Input
                      label="Company"
                      labelClassName="text-foreground"
                      className="border-border bg-background text-foreground placeholder:text-muted"
                      {...register(`experiences.${i}.company` as const)}
                    />
                    <Input
                      label="Start"
                      type="date"
                      labelClassName="text-foreground"
                      className="border-border bg-background text-foreground"
                      {...register(`experiences.${i}.startDate` as const)}
                    />
                    <Input
                      label="End"
                      type="date"
                      labelClassName="text-foreground"
                      className="border-border bg-background text-foreground"
                      {...register(`experiences.${i}.endDate` as const)}
                    />
                    <Input
                      label="Description"
                      labelClassName="text-foreground"
                      className="md:col-span-5 border-border bg-background text-foreground placeholder:text-muted"
                      {...register(`experiences.${i}.description` as const)}
                    />

                    <div className="md:col-span-5">
                      <button
                        type="button"
                        className="text-xs font-semibold text-red-600 hover:text-red-700"
                        onClick={() => exp.remove(i)}
                      >
                        Remove role
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Skills */}
          <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm ring-1 ring-black/5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-brand">Skills</h2>
                <p className="mt-1 text-sm text-muted">Add skills and (optionally) years of experience.</p>
              </div>
              <button
                type="button"
                className="rounded-xl bg-brandBlue px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
                onClick={() => skl.append({ name: "", years: undefined })}
              >
                Add skill
              </button>
            </div>

            <div className="mt-5 space-y-5">
              {skl.fields.length === 0 ? (
                <div className="rounded-2xl border border-border bg-surface px-4 py-4 text-sm text-muted">
                  No skills yet. Add 8–12 relevant skills to start.
                </div>
              ) : null}

              {skl.fields.map((f, i) => (
                <div key={f.id} className="rounded-3xl border border-border bg-surface p-5">
                  <div className="grid gap-3 md:grid-cols-3">
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
                          labelClassName="text-foreground"
                          inputClassName="border-border bg-background text-foreground placeholder:text-muted"
                          panelClassName="border-border bg-surface"
                          optionClassName="text-foreground hover:bg-surface"
                        />
                      )}
                    />
                    <Input
                      label="Years"
                      type="number"
                      min={0}
                      max={50}
                      labelClassName="text-foreground"
                      className="border-border bg-background text-foreground placeholder:text-muted"
                      {...register(`skills.${i}.years` as const)}
                    />
                    <div className="flex items-end">
                      <button
                        type="button"
                        className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:bg-border/40"
                        onClick={() => skl.remove(i)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Sticky-ish bottom action bar */}
          <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm ring-1 ring-black/5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-muted">
                <span className="font-semibold text-foreground">Almost done.</span> You can edit this anytime later.
              </div>

              <Button
                type="submit"
                isLoading={formDisabled}
                disabled={formDisabled}
                className="bg-brandBlue text-white hover:opacity-95"
              >
                Save and continue
              </Button>
            </div>
          </div>
        </form>
    </>
  );

  const avatarDialog = (
    <AvatarCropperDialog
      isOpen={isEditorOpen}
      imageSrc={editorImageSrc}
      onClose={() => {
        setIsEditorOpen(false);
        setEditorImageSrc(null);
      }}
      onSave={handleAvatarSave}
    />
  );

  if (isEmbedded) {
    return (
      <div className="bg-background text-foreground">
        {formBody}
        {avatarDialog}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Onboarding</p>
          <h1 className="mt-2 font-serif text-3xl font-bold text-brand md:text-4xl">
            Build a profile companies can trust.
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-foreground/75">
            Add the basics now—then refine later. We keep everything structured so employers can scan fast.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 py-10">
        {formBody}
      </div>
      {avatarDialog}
    </main>
  );
}
