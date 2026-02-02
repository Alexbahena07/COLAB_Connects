"use client";

import { useForm, useFieldArray, Controller } from "react-hook-form";
import { useEffect, useState, useRef, type ChangeEvent, type PointerEvent } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Autocomplete from "@/components/ui/Autocomplete";
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
};

type ResumeMetadata =
  | {
      fileName: string;
      fileType?: string | null;
    }
  | null;

const AVATAR_SIZE = 160;
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

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [imageDims, setImageDims] = useState<{ width: number; height: number } | null>(null);

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const avatarImageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);
  const previousAvatarUrlRef = useRef<string | null>(null);

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
        setAvatarFile(null);
        setAvatarError(null);
        setCropZoom(1);
        setCropOffset({ x: 0, y: 0 });
        setImageDims(null);
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
        setAvatarFile(null);
        setAvatarError(null);
        setCropZoom(1);
        setCropOffset({ x: 0, y: 0 });
        setImageDims(null);
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

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

  const getScaled = () => {
    if (!imageDims) return null;
    const baseScale = Math.max(AVATAR_SIZE / imageDims.width, AVATAR_SIZE / imageDims.height);
    const scale = baseScale * cropZoom;
    return { scale, width: imageDims.width * scale, height: imageDims.height * scale };
  };

  const clampOffset = (offset: { x: number; y: number }) => {
    const scaled = getScaled();
    if (!scaled) return offset;
    const minX = Math.min(0, AVATAR_SIZE - scaled.width);
    const minY = Math.min(0, AVATAR_SIZE - scaled.height);
    return { x: clamp(offset.x, minX, 0), y: clamp(offset.y, minY, 0) };
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
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

    const nextUrl = URL.createObjectURL(file);
    setAvatarUrl(nextUrl);
    setAvatarFile(file);
    setCropZoom(1);
    setCropOffset({ x: 0, y: 0 });
    setImageDims(null);
  };

  useEffect(() => {
    const previous = previousAvatarUrlRef.current;
    if (previous && previous.startsWith("blob:") && previous !== avatarUrl) URL.revokeObjectURL(previous);
    previousAvatarUrlRef.current = avatarUrl;
  }, [avatarUrl]);

  useEffect(() => {
    setCropOffset((prev) => clampOffset(prev));
  }, [cropZoom, imageDims]);

  const handleAvatarImageLoad = () => {
    const img = avatarImageRef.current;
    if (!img) return;

    const dims = { width: img.naturalWidth, height: img.naturalHeight };
    setImageDims(dims);

    const baseScale = Math.max(AVATAR_SIZE / dims.width, AVATAR_SIZE / dims.height);
    const width = dims.width * baseScale * cropZoom;
    const height = dims.height * baseScale * cropZoom;

    setCropOffset({
      x: (AVATAR_SIZE - width) / 2,
      y: (AVATAR_SIZE - height) / 2,
    });
  };

  const handleDragStart = (event: PointerEvent<HTMLDivElement>) => {
    if (!imageDims) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: cropOffset.x, y: cropOffset.y, startX: event.clientX, startY: event.clientY };
  };

  const handleDragMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const next = {
      x: dragRef.current.x + (event.clientX - dragRef.current.startX),
      y: dragRef.current.y + (event.clientY - dragRef.current.startY),
    };
    setCropOffset(clampOffset(next));
  };

  const handleDragEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
  };

  const getCroppedAvatar = () => {
    if (!avatarImageRef.current || !imageDims) return null;

    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const baseScale = Math.max(AVATAR_SIZE / imageDims.width, AVATAR_SIZE / imageDims.height);
    const scale = baseScale * cropZoom;
    const drawWidth = imageDims.width * scale;
    const drawHeight = imageDims.height * scale;

    ctx.drawImage(avatarImageRef.current, cropOffset.x, cropOffset.y, drawWidth, drawHeight);
    return canvas.toDataURL("image/jpeg", 0.9);
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

    if (avatarFile) {
      const avatarDataUrl = getCroppedAvatar();
      if (!avatarDataUrl) {
        setAvatarError("We couldn't crop that photo. Try again.");
        return;
      }
      payload.avatar = { dataUrl: avatarDataUrl };
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

  /**
   * DESIGN SYSTEM (matches homepage + register):
   * - No page-wide gradient.
   * - Dark brand background with "surface" cards and subtle borders.
   * - BrandBlue used for accents (buttons, rings, focus, section dividers).
   */
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Top header block (no gradient) */}
      <div className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">Onboarding</p>
          <h1 className="mt-2 font-serif text-3xl font-bold text-white md:text-4xl">
            Build a profile companies can trust.
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/75">
            Add the basics now—then refine later. We keep everything structured so employers can scan fast.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Status banners */}
        {loadError ? (
          <div className="mb-6 rounded-2xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-3 text-sm text-white/90">
            {loadError}
          </div>
        ) : null}

        {loading ? (
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75">
            Loading saved profile...
          </div>
        ) : null}

        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Basic Profile */}
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-sm ring-1 ring-white/5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-white/80">
                  Basic info
                </h2>
                <p className="mt-1 text-sm text-white/65">
                  Add a headline, location, and a professional photo.
                </p>
              </div>

              
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
              {/* Avatar card */}
              <div className="rounded-3xl border border-white/10 bg-brand p-5 ring-1 ring-white/10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Profile photo</p>
                    <p className="mt-1 text-xs text-white/70">
                      Drag to position. Use zoom for the perfect crop.
                    </p>
                  </div>

                  {avatarUrl ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarUrl(null);
                        setAvatarFile(null);
                        setImageDims(null);
                        setCropZoom(1);
                        setCropOffset({ x: 0, y: 0 });
                        clearAvatarInput();
                      }}
                      className="rounded-xl border border-white/25 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap items-start gap-4">
                  <div
                    className="relative h-40 w-40 overflow-hidden rounded-full border border-white/25 bg-white/5 shadow-sm ring-2 ring-white/10"
                    style={{ touchAction: "none" }}
                    onPointerDown={handleDragStart}
                    onPointerMove={handleDragMove}
                    onPointerUp={handleDragEnd}
                    onPointerLeave={handleDragEnd}
                  >
                    {avatarUrl ? (
                      <img
                        ref={avatarImageRef}
                        src={avatarUrl}
                        alt="Profile preview"
                        onLoad={handleAvatarImageLoad}
                        className="absolute left-0 top-0 select-none cursor-grab active:cursor-grabbing"
                        style={
                          imageDims
                            ? {
                                width: imageDims.width * (getScaled()?.scale ?? 1),
                                height: imageDims.height * (getScaled()?.scale ?? 1),
                                transform: `translate(${cropOffset.x}px, ${cropOffset.y}px)`,
                              }
                            : { width: "100%", height: "100%", objectFit: "cover" }
                        }
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-white/70">
                        Upload a photo
                      </div>
                    )}
                  </div>

                  <div className="min-w-[160px] flex-1 space-y-3">
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

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-white/80" htmlFor="avatar-zoom">
                        Zoom
                      </label>
                      <input
                        id="avatar-zoom"
                        type="range"
                        min={1}
                        max={3}
                        step={0.05}
                        value={cropZoom}
                        onChange={(event) => setCropZoom(Number(event.target.value))}
                        className="w-full accent-[var(--brandBlue)]"
                        disabled={!avatarUrl}
                      />
                      <p className="text-xs text-white/70">Tip: keep the face centered for best results.</p>
                      {avatarError ? <p className="text-xs text-red-400">{avatarError}</p> : null}
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70">
                  We recommend a clean headshot with good lighting.
                </div>
              </div>

              {/* Profile fields */}
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 ring-1 ring-white/5">
                <div className="grid gap-4 md:grid-cols-3">
                  <Input
                    label="First name"
                    labelClassName="text-foreground"
                    className="border-white/15 bg-background/30 text-foreground placeholder:text-white/60 focus:ring-white/20"
                    {...register("profile.firstName")}
                  />

                  <Input
                    label="Last name"
                    labelClassName="text-foreground"
                    className="border-white/15 bg-background/30 text-foreground placeholder:text-white/60 focus:ring-white/20"
                    {...register("profile.lastName")}
                  />

                  <Input
                    label="Headline"
                    placeholder="e.g., Financial Analyst • FP&A • SQL"
                    labelClassName="text-foreground"
                    className="border-white/15 bg-background/30 text-foreground placeholder:text-white/60 focus:ring-white/20"
                    {...register("profile.headline")}
                  />

                  {/* Desired work location with Autocomplete */}
                  <div className="md:col-span-3">
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
                          inputClassName="border-white/15 bg-background/30 text-foreground placeholder:text-white/60 focus:ring-white/20"
                          panelClassName="border-white/10 bg-[var(--surface)]"
                          optionClassName="text-foreground hover:bg-background/40"
                        />
                      )}
                    />
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-brandBlue/10 px-4 py-3 text-xs text-white/75">
                  Your headline is what recruiters scan first—lead with role + tools (ex: “Analyst • Excel • SQL”).
                </div>
              </div>
            </div>
          </section>

          {/* Resume upload */}
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-sm ring-1 ring-white/5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-white/80">Resume (PDF)</h2>
                <p className="mt-1 text-sm text-white/65">Upload a PDF (max 5MB). Required for students.</p>
              </div>

              {existingResume ? (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 font-semibold text-emerald-200">
                    On file: {existingResume.fileName}
                  </span>
                  <button
                    type="button"
                    onClick={markResumeForRemoval}
                    className="rounded-xl border border-red-400/40 bg-red-400/10 px-3 py-2 font-semibold text-red-200 hover:bg-red-400/15"
                  >
                    Remove
                  </button>
                </div>
              ) : storedResume && pendingResumeRemoval ? (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-red-400/40 bg-red-400/10 px-3 py-1 font-semibold text-red-200">
                    Removal pending — upload a new PDF to finish.
                  </span>
                  <button
                    type="button"
                    onClick={cancelResumeRemoval}
                    className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 font-semibold text-white hover:bg-white/10"
                  >
                    Keep current
                  </button>
                </div>
              ) : (
                <span className="rounded-full bg-brandBlue/15 px-3 py-1 text-xs font-semibold text-white/85">
                  Required
                </span>
              )}
            </div>

            <div className="mt-5 space-y-2">
              <label
                htmlFor="resume-upload"
                className="flex cursor-pointer items-center justify-between rounded-2xl border border-dashed border-white/20 bg-background/20 px-4 py-4 text-sm font-semibold text-white hover:border-brandBlue/60 hover:bg-background/30"
              >
                <span>{resumeFile ? "Replace selected PDF" : "Upload PDF"}</span>
                <span className="text-xs font-normal text-white/60">Max 5MB</span>
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
                <p className="text-xs text-white/75">Selected file: {resumeFile.name}</p>
              ) : pendingResumeRemoval && storedResume ? (
                <p className="text-xs text-white/70">Resume removal pending. Choose a PDF above to replace it.</p>
              ) : existingResume ? (
                <p className="text-xs text-white/70">Current resume: {existingResume.fileName}</p>
              ) : (
                <p className="text-xs text-white/70">No resume uploaded yet.</p>
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
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-sm ring-1 ring-white/5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-white/80">Degrees</h2>
                <p className="mt-1 text-sm text-white/65">Add education history. Keep it clean and scannable.</p>
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
                <div className="rounded-2xl border border-white/10 bg-background/15 px-4 py-4 text-sm text-white/70">
                  No degrees yet. Add one to help employers understand your background.
                </div>
              ) : null}

              {deg.fields.map((f, i) => (
                <div key={f.id} className="rounded-3xl border border-white/10 bg-background/15 p-5">
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
                          inputClassName="border-white/15 bg-background/30 text-foreground placeholder:text-white/60 focus:ring-white/20"
                          panelClassName="border-white/10 bg-[var(--surface)]"
                          optionClassName="text-foreground hover:bg-background/40"
                        />
                      )}
                    />

                    <Input
                      label="Degree"
                      labelClassName="text-foreground"
                      className="border-white/15 bg-background/30 text-foreground placeholder:text-white/60 focus:ring-white/20"
                      {...register(`degrees.${i}.degree` as const)}
                    />
                    <Input
                      label="Field"
                      labelClassName="text-foreground"
                      className="border-white/15 bg-background/30 text-foreground placeholder:text-white/60 focus:ring-white/20"
                      {...register(`degrees.${i}.field` as const)}
                    />
                    <Input
                      label="Start"
                      type="date"
                      labelClassName="text-foreground"
                      className="border-white/15 bg-background/30 text-foreground focus:ring-white/20"
                      {...register(`degrees.${i}.startDate` as const)}
                    />
                    <Input
                      label="End"
                      type="date"
                      labelClassName="text-foreground"
                      className="border-white/15 bg-background/30 text-foreground focus:ring-white/20"
                      {...register(`degrees.${i}.endDate` as const)}
                    />

                    <div className="md:col-span-5">
                      <button
                        type="button"
                        className="text-xs font-semibold text-red-200 hover:text-red-100"
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
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-sm ring-1 ring-white/5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-white/80">Certificates</h2>
                <p className="mt-1 text-sm text-white/65">Add credentials that strengthen your story.</p>
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
                <div className="rounded-2xl border border-white/10 bg-background/15 px-4 py-4 text-sm text-white/70">
                  No certificates yet. Add one if it’s relevant (Bloomberg, CPA track, Coursera, etc.).
                </div>
              ) : null}

              {cert.fields.map((f, i) => (
                <div key={f.id} className="rounded-3xl border border-white/10 bg-background/15 p-5">
                  <div className="grid gap-3 md:grid-cols-5">
                    <Input
                      label="Name"
                      labelClassName="text-foreground"
                      className="border-white/15 bg-background/30 text-foreground placeholder:text-white/60 focus:ring-white/20"
                      {...register(`certificates.${i}.name` as const)}
                    />
                    <Input
                      label="Issuer"
                      labelClassName="text-foreground"
                      className="border-white/15 bg-background/30 text-foreground placeholder:text-white/60 focus:ring-white/20"
                      {...register(`certificates.${i}.issuer` as const)}
                    />
                    <Input
                      label="Issued"
                      type="date"
                      labelClassName="text-foreground"
                      className="border-white/15 bg-background/30 text-foreground focus:ring-white/20"
                      {...register(`certificates.${i}.issuedAt` as const)}
                    />
                    <Input
                      label="Cred. ID"
                      labelClassName="text-foreground"
                      className="border-white/15 bg-background/30 text-foreground placeholder:text-white/60 focus:ring-white/20"
                      {...register(`certificates.${i}.credentialId` as const)}
                    />
                    <Input
                      label="URL"
                      type="url"
                      labelClassName="text-foreground"
                      className="border-white/15 bg-background/30 text-foreground placeholder:text-white/60 focus:ring-white/20"
                      {...register(`certificates.${i}.credentialUrl` as const)}
                    />

                    <div className="md:col-span-5">
                      <button
                        type="button"
                        className="text-xs font-semibold text-red-200 hover:text-red-100"
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
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-sm ring-1 ring-white/5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-white/80">Work history</h2>
                <p className="mt-1 text-sm text-white/65">Highlight internships, projects, and roles.</p>
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
                <div className="rounded-2xl border border-white/10 bg-background/15 px-4 py-4 text-sm text-white/70">
                  No roles yet. Add your most relevant experience first.
                </div>
              ) : null}

              {exp.fields.map((f, i) => (
                <div key={f.id} className="rounded-3xl border border-white/10 bg-background/15 p-5">
                  <div className="grid gap-3 md:grid-cols-5">
                    <Input
                      label="Title"
                      labelClassName="text-foreground"
                      className="border-white/15 bg-background/30 text-foreground placeholder:text-white/60 focus:ring-white/20"
                      {...register(`experiences.${i}.title` as const)}
                    />
                    <Input
                      label="Company"
                      labelClassName="text-foreground"
                      className="border-white/15 bg-background/30 text-foreground placeholder:text-white/60 focus:ring-white/20"
                      {...register(`experiences.${i}.company` as const)}
                    />
                    <Input
                      label="Start"
                      type="date"
                      labelClassName="text-foreground"
                      className="border-white/15 bg-background/30 text-foreground focus:ring-white/20"
                      {...register(`experiences.${i}.startDate` as const)}
                    />
                    <Input
                      label="End"
                      type="date"
                      labelClassName="text-foreground"
                      className="border-white/15 bg-background/30 text-foreground focus:ring-white/20"
                      {...register(`experiences.${i}.endDate` as const)}
                    />
                    <Input
                      label="Description"
                      labelClassName="text-foreground"
                      className="md:col-span-5 border-white/15 bg-background/30 text-foreground placeholder:text-white/60 focus:ring-white/20"
                      {...register(`experiences.${i}.description` as const)}
                    />

                    <div className="md:col-span-5">
                      <button
                        type="button"
                        className="text-xs font-semibold text-red-200 hover:text-red-100"
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
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-sm ring-1 ring-white/5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-white/80">Skills</h2>
                <p className="mt-1 text-sm text-white/65">Add skills and (optionally) years of experience.</p>
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
                <div className="rounded-2xl border border-white/10 bg-background/15 px-4 py-4 text-sm text-white/70">
                  No skills yet. Add 8–12 relevant skills to start.
                </div>
              ) : null}

              {skl.fields.map((f, i) => (
                <div key={f.id} className="rounded-3xl border border-white/10 bg-background/15 p-5">
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
                          inputClassName="border-white/15 bg-background/30 text-foreground placeholder:text-white/60 focus:ring-white/20"
                          panelClassName="border-white/10 bg-[var(--surface)]"
                          optionClassName="text-foreground hover:bg-background/40"
                        />
                      )}
                    />
                    <Input
                      label="Years"
                      type="number"
                      min={0}
                      max={50}
                      labelClassName="text-foreground"
                      className="border-white/15 bg-background/30 text-foreground placeholder:text-white/60 focus:ring-white/20"
                      {...register(`skills.${i}.years` as const)}
                    />
                    <div className="flex items-end">
                      <button
                        type="button"
                        className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
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
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm ring-1 ring-white/5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-white/70">
                <span className="font-semibold text-white">Almost done.</span> You can edit this anytime later.
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
      </div>
    </main>
  );
}
