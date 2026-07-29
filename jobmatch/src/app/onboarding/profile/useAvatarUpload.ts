"use client";

import { useState, useRef, type ChangeEvent } from "react";
import { fileToDataUrl } from "./utils";
import { normalizeImageFile } from "@/lib/normalizeImageFile";

// Applied to the normalized file (after HEIC conversion + downscaling), not
// the raw upload — an iPhone photo is routinely 2-6MB straight off the
// camera, but normalizeImageFile shrinks it well below this before we ever
// need to reject anything.
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
// Sanity ceiling on the raw file, just to avoid asking the browser to decode
// something pathological (e.g. a 200MB scan) before normalization runs.
const MAX_RAW_BYTES = 25 * 1024 * 1024;

export function useAvatarUpload() {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [editorImageSrc, setEditorImageSrc] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [croppedAvatarBlob, setCroppedAvatarBlob] = useState<Blob | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const clearAvatarInput = () => {
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  const resetAvatar = (url: string | null) => {
    setAvatarUrl(url);
    setAvatarError(null);
    setEditorImageSrc(null);
    setIsEditorOpen(false);
    setCroppedAvatarBlob(null);
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    setAvatarError(null);
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const rawFile = files.item(0);
    if (!rawFile) return;

    const looksLikeImage =
      rawFile.type.startsWith("image/") || /\.(heic|heif)$/i.test(rawFile.name);
    if (!looksLikeImage) {
      setAvatarError("Upload a JPG or PNG image.");
      clearAvatarInput();
      return;
    }
    if (rawFile.size > MAX_RAW_BYTES) {
      setAvatarError("That image is too large. Try a smaller photo.");
      clearAvatarInput();
      return;
    }

    let file: File;
    try {
      file = await normalizeImageFile(rawFile);
    } catch (err) {
      console.error("Failed to process avatar image", err);
      setAvatarError(
        "We couldn't process that photo. Try a JPG or PNG, or re-save it from your Photos app first."
      );
      clearAvatarInput();
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError("We couldn't shrink that photo enough. Try a different one.");
      clearAvatarInput();
      return;
    }

    const dataUrl = await fileToDataUrl(file);
    setEditorImageSrc(dataUrl);
    setIsEditorOpen(true);
    clearAvatarInput();
  };

  const handleAvatarSave = ({ blob, dataUrl }: { blob: Blob; dataUrl: string }) => {
    setCroppedAvatarBlob(blob);
    setAvatarUrl(dataUrl);
    setIsEditorOpen(false);
    setEditorImageSrc(null);
  };

  const removeAvatar = () => {
    setAvatarUrl(null);
    setCroppedAvatarBlob(null);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditorImageSrc(null);
  };

  return {
    avatarUrl,
    avatarError,
    setAvatarError,
    editorImageSrc,
    isEditorOpen,
    croppedAvatarBlob,
    avatarInputRef,
    handleAvatarChange,
    handleAvatarSave,
    removeAvatar,
    resetAvatar,
    closeEditor,
  };
}
