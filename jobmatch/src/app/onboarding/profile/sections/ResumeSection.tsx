"use client";

import { type ChangeEvent, type RefObject } from "react";
import type { ResumeMetadata } from "../schema";

type Props = {
  formDisabled: boolean;
  resumeFile: File | null;
  resumeError: string | null;
  storedResume: ResumeMetadata;
  existingResume: ResumeMetadata;
  pendingResumeRemoval: boolean;
  resumeInputRef: RefObject<HTMLInputElement | null>;
  onResumeChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onMarkForRemoval: () => void;
  onCancelRemoval: () => void;
};

export function ResumeSection({
  formDisabled,
  resumeFile,
  resumeError,
  storedResume,
  existingResume,
  pendingResumeRemoval,
  resumeInputRef,
  onResumeChange,
  onMarkForRemoval,
  onCancelRemoval,
}: Props) {
  return (
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
              onClick={onMarkForRemoval}
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
              onClick={onCancelRemoval}
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
          onChange={onResumeChange}
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
  );
}
