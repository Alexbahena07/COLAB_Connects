"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import AvatarCropperDialog from "@/components/ui/AvatarCropperDialog";
import { FormSchema, DEFAULT_VALUES, type FormData, type ProfileResponse } from "./schema";
import { useAvatarUpload } from "./useAvatarUpload";
import { useResumeUpload } from "./useResumeUpload";
import { BasicInfoSection } from "./sections/BasicInfoSection";
import { ResumeSection } from "./sections/ResumeSection";
import { DegreesSection } from "./sections/DegreesSection";
import { CertificatesSection } from "./sections/CertificatesSection";
import { WorkHistorySection } from "./sections/WorkHistorySection";
import { SkillsSection } from "./sections/SkillsSection";

type ProfileFormProps = {
  redirectTo?: string;
  isEmbedded?: boolean;
};

export default function ProfileForm({ redirectTo = "/dashboard", isEmbedded = false }: ProfileFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const avatar = useAvatarUpload();
  const resume = useResumeUpload();

  const { register, control, handleSubmit, formState: { isSubmitting }, reset } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load profile");

        const data: ProfileResponse = await res.json();
        if (!active) return;

        reset({
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
        });

        setLoadError(null);

        const resumeMeta =
          data?.resume && typeof data.resume === "object" && data.resume?.fileName
            ? { fileName: data.resume.fileName, fileType: data.resume.fileType ?? "application/pdf" }
            : null;

        resume.resetResume(resumeMeta);
        avatar.resetAvatar(typeof data?.avatarUrl === "string" ? data.avatarUrl : null);
      } catch (error) {
        console.error(error);
        if (!active) return;
        setLoadError("We couldn't load your saved profile. You can still make updates below.");
        reset(DEFAULT_VALUES);
        resume.resetResume(null);
        avatar.resetAvatar(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadProfile();
    return () => { active = false; };
  }, [reset]); // eslint-disable-line react-hooks/exhaustive-deps

  const formDisabled = loading || isSubmitting;

  const onSubmit = async (data: FormData) => {
    if (loading) return;
    resume.setResumeError(null);
    setSaveError(null);

    if (resume.pendingResumeRemoval && !resume.resumeFile) {
      resume.setResumeError("Upload a new resume before removing the current one.");
      return;
    }
    if (!resume.resumeFile && !resume.existingResume) {
      resume.setResumeError("Please upload your resume as a PDF before continuing.");
      return;
    }

    let resumePayload: { fileName: string; fileType: string; url: string } | null = null;
    if (resume.resumeFile) {
      try {
        const uploadFormData = new FormData();
        uploadFormData.append("file", resume.resumeFile);
        const uploadRes = await fetch("/api/profile/resume/upload", {
          method: "POST",
          body: uploadFormData,
        });
        if (!uploadRes.ok) throw new Error("Upload failed");
        const { url } = await uploadRes.json();
        resumePayload = {
          fileName: resume.resumeFile.name,
          fileType: resume.resumeFile.type || "application/pdf",
          url,
        };
      } catch (error) {
        console.error(error);
        resume.setResumeError("We couldn't upload that PDF. Try again.");
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

    if (avatar.croppedAvatarDataUrl) payload.avatar = { dataUrl: avatar.croppedAvatarDataUrl };
    if (resumePayload) payload.resume = resumePayload;

    const res = await fetch("/api/profile/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) router.push(redirectTo);
    else setSaveError("Failed to save your profile. Please try again.");
  };

  const formBody = (
    <>
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

      <form id="profile-form" className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
        <BasicInfoSection
          control={control}
          register={register}
          isEmbedded={isEmbedded}
          formDisabled={formDisabled}
          avatarUrl={avatar.avatarUrl}
          avatarError={avatar.avatarError}
          avatarInputRef={avatar.avatarInputRef}
          onAvatarChange={avatar.handleAvatarChange}
        />
        <ResumeSection
          formDisabled={formDisabled}
          resumeFile={resume.resumeFile}
          resumeError={resume.resumeError}
          storedResume={resume.storedResume}
          existingResume={resume.existingResume}
          pendingResumeRemoval={resume.pendingResumeRemoval}
          resumeInputRef={resume.resumeInputRef}
          onResumeChange={resume.handleResumeChange}
          onMarkForRemoval={resume.markResumeForRemoval}
          onCancelRemoval={resume.cancelResumeRemoval}
        />
        <DegreesSection control={control} register={register} />
        <CertificatesSection control={control} register={register} />
        <WorkHistorySection control={control} register={register} />
        <SkillsSection control={control} register={register} />

        {saveError ? (
          <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
            {saveError}
          </p>
        ) : null}
      </form>
    </>
  );

  const avatarDialog = (
    <AvatarCropperDialog
      isOpen={avatar.isEditorOpen}
      imageSrc={avatar.editorImageSrc}
      onClose={avatar.closeEditor}
      onSave={avatar.handleAvatarSave}
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
