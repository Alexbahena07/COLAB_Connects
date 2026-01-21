"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import AvatarCropperDialog from "@/components/ui/AvatarCropperDialog";
import Button from "@/components/ui/Button";

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
      const dataUrl = await readFileAsDataUrl(file);
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
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-white/40 bg-white/10">
        {currentImage ? (
          <Image
            src={currentImage}
            alt="Company profile photo"
            width={64}
            height={64}
            className="h-16 w-16 object-cover"
            unoptimized
          />
        ) : (
          <span className="text-xs font-semibold text-white/70">No photo</span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            className="btn-outline-brand h-9 !border-white/60 !text-white hover:bg-white/10"
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
            className="btn-outline-brand h-9 !border-white/60 !text-white hover:bg-white/10"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            Upload new
          </Button>
        </div>
        <p className="text-xs text-white/70">
          JPG, PNG, or WebP. Recommended 512x512.
        </p>
        {error ? <p className="text-xs text-red-300">{error}</p> : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
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
