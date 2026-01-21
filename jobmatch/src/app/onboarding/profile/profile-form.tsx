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

const AVATAR_SIZE = 160;
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2MB

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
  const [imageDims, setImageDims] = useState<{ width: number; height: number } | null>(
    null
  );
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const avatarImageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(
    null
  );
  const previousAvatarUrlRef = useRef<string | null>(null);

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
    if (resumeInputRef.current) {
      resumeInputRef.current.value = "";
    }
  };

  const clearAvatarInput = () => {
    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
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

  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

  const getScaled = () => {
    if (!imageDims) return null;
    const baseScale = Math.max(AVATAR_SIZE / imageDims.width, AVATAR_SIZE / imageDims.height);
    const scale = baseScale * cropZoom;
    return {
      scale,
      width: imageDims.width * scale,
      height: imageDims.height * scale,
    };
  };

  const clampOffset = (offset: { x: number; y: number }) => {
    const scaled = getScaled();
    if (!scaled) return offset;
    const minX = Math.min(0, AVATAR_SIZE - scaled.width);
    const minY = Math.min(0, AVATAR_SIZE - scaled.height);
    return {
      x: clamp(offset.x, minX, 0),
      y: clamp(offset.y, minY, 0),
    };
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    setAvatarError(null);
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }
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
    if (previous && previous.startsWith("blob:") && previous !== avatarUrl) {
      URL.revokeObjectURL(previous);
    }
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
    dragRef.current = {
      x: cropOffset.x,
      y: cropOffset.y,
      startX: event.clientX,
      startY: event.clientY,
    };
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
    if (dragRef.current) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
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
        <p className="rounded-lg border border-yellow-400 bg-yellow-400/10 px-3 py-2 text-sm text-[var(--foreground)]">
          {loadError}
        </p>
      ) : null}

      {loading ? (
        <p className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]/80">
          Loading saved profile...
        </p>
      ) : null}

      {/* Basic Profile */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--brand)]">
          Basic info
        </h2>
          <div className="mb-4 flex flex-wrap items-start gap-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-white">Profile photo</p>
              <div
              className="relative h-40 w-40 overflow-hidden rounded-full border border-white/30 bg-[var(--surface)] shadow-sm ring-2 ring-white/10"
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
                <div className="flex h-full w-full items-center justify-center text-xs text-[var(--foreground)]/70">
                  Upload a photo
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor="avatar-upload"
                className="cursor-pointer rounded-xl border border-[var(--brandBlue)] px-3 py-2 text-xs font-semibold text-[var(--brand)] hover:bg-[var(--brandBlue)] hover:text-white"
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
                  className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface)]"
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>
          <div className="min-w-[240px] flex-1 space-y-2">
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
            <p className="text-xs text-white/70">
              Drag the image to reposition the crop.
            </p>
            {avatarError ? <p className="text-xs text-red-600">{avatarError}</p> : null}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          
          <Input
            label="First name"
            labelClassName="text-white"
            className="border-white/30 bg-[var(--surface)] text-white placeholder:text-white/70 focus:ring-white/30"
            {...register("profile.firstName")}
          />
          
          <Input
            label="Last name"
            labelClassName="text-white"
            className="border-white/30 bg-[var(--surface)] text-white placeholder:text-white/70 focus:ring-white/30"
            {...register("profile.lastName")}
          />
          <Input
            label="Headline"
            placeholder="e.g., Full-stack Engineer"
            labelClassName="text-white"
            className="border-white/30 bg-[var(--surface)] text-white placeholder:text-white/70 focus:ring-white/30"
            {...register("profile.headline")}
          />

          {/* Desired work location with Autocomplete */}
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
                labelClassName="text-white"
                inputClassName="border-white/30 bg-[var(--surface)] text-white placeholder:text-white/70 focus:ring-white/30"
                panelClassName="border-white/10 bg-[var(--surface)]"
                optionClassName="text-[var(--foreground)] hover:bg-[var(--background)]"
              />
            )}
          />
        </div>
      </section>

      {/* Resume upload */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--brand)]">
              Resume (PDF)
            </h2>
            <p className="text-sm text-[var(--foreground)]/70">
              Upload a PDF of your resume (max 5MB). Required for students.
            </p>
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
                className="rounded-md border border-[var(--brandBlue)] px-2 py-1 font-semibold text-[var(--brand)] hover:bg-[var(--brandBlue)] hover:text-white"
              >
                Keep current resume
              </button>
            </div>
          ) : (
            <span className="text-xs font-semibold text-[var(--brand)]">Required</span>
          )}
        </div>
        <div className="mt-4 space-y-2">
          <label
            htmlFor="resume-upload"
            className="flex cursor-pointer items-center justify-between rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--brand)] hover:bg-[var(--brandBlue)] hover:text-white"
          >
            <span>{resumeFile ? "Replace selected PDF" : "Upload PDF"}</span>
            <span className="text-xs font-normal text-[var(--foreground)]/70">Max 5MB</span>
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
            <p className="text-xs text-[var(--foreground)]">Selected file: {resumeFile.name}</p>
          ) : pendingResumeRemoval && storedResume ? (
            <p className="text-xs text-[var(--foreground)]/80">Resume removal pending. Choose a PDF above to replace it.</p>
          ) : existingResume ? (
            <p className="text-xs text-[var(--foreground)]/80">Current resume: {existingResume.fileName}</p>
          ) : (
            <p className="text-xs text-[var(--foreground)]/80">No resume uploaded yet.</p>
          )}
          {resumeError ? <p className="text-xs text-red-600">{resumeError}</p> : null}
        </div>
      </section>

      {/* Degrees */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--brand)]">
            Degrees
          </h2>
          <button
            type="button"
            className="text-sm rounded-lg border border-[var(--brandBlue)] px-3 py-1 text-[var(--brand)] hover:bg-[var(--brandBlue)] hover:text-white"
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
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--brand)]">
            Certificates
          </h2>
          <button
            type="button"
            className="text-sm rounded-lg border border-[var(--brandBlue)] px-3 py-1 text-[var(--brand)] hover:bg-[var(--brandBlue)] hover:text-white"
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
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--brand)]">
            Work history
          </h2>
          <button
            type="button"
            className="text-sm rounded-lg border border-[var(--brandBlue)] px-3 py-1 text-[var(--brand)] hover:bg-[var(--brandBlue)] hover:text-white"
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
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--brand)]">
            Skills
          </h2>
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
        <Button type="submit" isLoading={formDisabled} disabled={formDisabled} className="bg-[var(--brand)] text-white">
          Save and continue
        </Button>
      </div>
    </form>
  );
}
