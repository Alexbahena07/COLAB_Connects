"use client";

import { useState, useRef, type ChangeEvent } from "react";
import { fileToDataUrl } from "./utils";
import { normalizeImageFile } from "@/lib/normalizeImageFile";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export function useAvatarUpload() {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [editorImageSrc, setEditorImageSrc] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [croppedAvatarDataUrl, setCroppedAvatarDataUrl] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const clearAvatarInput = () => {
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  const resetAvatar = (url: string | null) => {
    setAvatarUrl(url);
    setAvatarError(null);
    setEditorImageSrc(null);
    setIsEditorOpen(false);
    setCroppedAvatarDataUrl(null);
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
    if (rawFile.size > MAX_AVATAR_BYTES) {
      setAvatarError("Profile photo must be 2MB or smaller.");
      clearAvatarInput();
      return;
    }

    let file: File;
    try {
      file = await normalizeImageFile(rawFile);
    } catch (err) {
      console.error("Failed to process avatar image", err);
      setAvatarError("We couldn't process that photo. Please try a different image.");
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

  const removeAvatar = () => {
    setAvatarUrl(null);
    setCroppedAvatarDataUrl(null);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditorImageSrc(null);
  };

  return {
    avatarUrl,
    avatarError,
    editorImageSrc,
    isEditorOpen,
    croppedAvatarDataUrl,
    avatarInputRef,
    handleAvatarChange,
    handleAvatarSave,
    removeAvatar,
    resetAvatar,
    closeEditor,
  };
}
