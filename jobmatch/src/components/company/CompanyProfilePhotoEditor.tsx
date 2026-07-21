"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import AvatarCropperDialog from "@/components/ui/AvatarCropperDialog";
import Button from "@/components/ui/Button";
import { normalizeImageFile } from "@/lib/normalizeImageFile";

type CompanyProfilePhotoEditorProps = {
  initialImage: string | null;
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read image"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });

export default function CompanyProfilePhotoEditor({
  initialImage,
}: CompanyProfilePhotoEditorProps) {
  const [currentImage, setCurrentImage] = useState<string | null>(initialImage);
  const [editorImage, setEditorImage] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSelectFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const normalized = await normalizeImageFile(file);
      const dataUrl = await readFileAsDataUrl(normalized);
      setEditorImage(dataUrl);
      setIsOpen(true);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("We couldn't load that image. Please try another file.");
    } finally {
      event.target.value = "";
    }
  };

  const handleSave = async (result: { blob: Blob; dataUrl: string }) => {
    setIsUploading(true);
    setError(null);
    try {
      const response = await fetch("/api/profile/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatar: {
            dataUrl: result.dataUrl,
          },
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(typeof payload?.error === "string" ? payload.error : "Upload failed");
      }
      setCurrentImage(result.dataUrl);
      setIsOpen(false);
      setEditorImage(null);
    } catch (err) {
      console.error(err);
      setError("We couldn't update your profile photo. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        {currentImage ? (
          <Image
            src={currentImage}
            alt="Company profile photo"
            width={64}
            height={64}
            className="h-16 w-16 max-w-none shrink-0 object-cover"
            unoptimized
          />
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 text-muted" aria-hidden="true"><rect x="3" y="9" width="18" height="12" rx="2"/><path d="M16 9V7a4 4 0 0 0-8 0v2"/></svg>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            className="btn-outline-brand h-9"
            onClick={() => {
              if (currentImage) {
                setEditorImage(currentImage);
                setIsOpen(true);
              } else {
                fileInputRef.current?.click();
              }
            }}
            disabled={isUploading}
          >
            {currentImage ? "Edit photo" : "Upload photo"}
          </Button>
          <Button
            type="button"
            className="btn-outline-brand h-9"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            Upload new
          </Button>
        </div>
        <p className="text-xs text-muted">
          JPG, PNG, or WebP. Recommended 512×512.
        </p>
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp, image/heic, image/heif, .heic, .heif"
        className="hidden"
        onChange={handleSelectFile}
      />

      <AvatarCropperDialog
        isOpen={isOpen}
        imageSrc={editorImage}
        onClose={() => {
          if (isUploading) return;
          setIsOpen(false);
          setEditorImage(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
}
