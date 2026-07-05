"use client";

import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import type { Area } from "react-easy-crop";
import { getCroppedImage } from "@/lib/image-crop";
import Button from "@/components/ui/Button";

type AvatarCropperDialogProps = {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onSave: (result: { blob: Blob; dataUrl: string }) => Promise<void> | void;
};

export default function AvatarCropperDialog({
  isOpen,
  imageSrc,
  onClose,
  onSave,
}: AvatarCropperDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setIsSaving(true);
    setError(null);
    try {
      const result = await getCroppedImage(imageSrc, croppedAreaPixels);
      await onSave(result);
    } catch (err) {
      console.error(err);
      setError("We couldn't save that image. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Edit profile photo"
    >
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 text-foreground shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-brand">Edit profile photo</h2>
            <p className="text-xs text-muted">
              Drag to reposition · Pinch or scroll to zoom
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close photo editor"
            className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-brand/5 disabled:opacity-50"
          >
            Close
          </button>
        </div>

        {/* Crop area */}
        <div className="relative mt-5 h-80 w-full overflow-hidden rounded-2xl bg-black/80">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="rect"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            classes={{ cropAreaClassName: "!rounded-2xl" }}
          />
        </div>

        {/* Zoom slider */}
        <div className="mt-4 flex items-center gap-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0 text-muted" aria-hidden="true">
            <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M11 8v6M8 11h6"/>
          </svg>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Zoom"
            className="w-full accent-brand"
          />
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 shrink-0 text-muted" aria-hidden="true">
            <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M11 8v6M8 11h6"/>
          </svg>
        </div>

        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

        {/* Actions */}
        <div className="mt-5 flex gap-3">
          <Button
            type="button"
            className="btn-brand flex-1"
            onClick={handleSave}
            isLoading={isSaving}
            disabled={isSaving}
          >
            Save photo
          </Button>
          <Button
            type="button"
            className="btn-outline-brand flex-1"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
