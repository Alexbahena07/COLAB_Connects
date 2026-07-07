"use client";

import { useState, useRef, type ChangeEvent } from "react";
import type { ResumeMetadata } from "./schema";

const MAX_RESUME_BYTES = 5 * 1024 * 1024;

export function useResumeUpload() {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [storedResume, setStoredResume] = useState<ResumeMetadata>(null);
  const [existingResume, setExistingResume] = useState<ResumeMetadata>(null);
  const [pendingResumeRemoval, setPendingResumeRemoval] = useState(false);
  const resumeInputRef = useRef<HTMLInputElement | null>(null);

  const clearResumeInput = () => {
    if (resumeInputRef.current) resumeInputRef.current.value = "";
  };

  const resetResume = (meta: ResumeMetadata) => {
    setStoredResume(meta);
    setExistingResume(meta);
    setPendingResumeRemoval(false);
    setResumeFile(null);
    setResumeError(null);
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
    if (!file) { setResumeFile(null); return; }

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

  return {
    resumeFile,
    resumeError,
    storedResume,
    existingResume,
    pendingResumeRemoval,
    resumeInputRef,
    handleResumeChange,
    markResumeForRemoval,
    cancelResumeRemoval,
    resetResume,
    setResumeError,
  };
}
