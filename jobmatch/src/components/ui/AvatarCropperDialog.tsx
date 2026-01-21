"use client";

import { useEffect, useRef, useState } from "react";
import { CropState, getCroppedImage } from "@/lib/image-crop";
import Button from "@/components/ui/Button";

type AvatarCropperDialogProps = {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onSave: (result: { blob: Blob; dataUrl: string }) => Promise<void> | void;
};

const CROP_SIZE = 320;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

export default function AvatarCropperDialog({
  isOpen,
  imageSrc,
  onClose,
  onSave,
}: AvatarCropperDialogProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragState = useRef<{ x: number; y: number; startX: number; startY: number } | null>(
    null
  );

  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      setImageSize(null);
      setError("Unable to load that image.");
    };
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    if (!isOpen) return;
    setOffsetX(0);
    setOffsetY(0);
    setZoom(1);
    setError(null);
  }, [isOpen, imageSrc]);

  const baseScale = imageSize
    ? Math.max(CROP_SIZE / imageSize.width, CROP_SIZE / imageSize.height)
    : 1;
  const scale = baseScale * zoom;
  const displayWidth = imageSize ? imageSize.width * scale : 0;
  const displayHeight = imageSize ? imageSize.height * scale : 0;
  const maxOffsetX = Math.max(0, (displayWidth - CROP_SIZE) / 2);
  const maxOffsetY = Math.max(0, (displayHeight - CROP_SIZE) / 2);

  const clampOffsets = (x: number, y: number) => ({
    x: Math.min(maxOffsetX, Math.max(-maxOffsetX, x)),
    y: Math.min(maxOffsetY, Math.max(-maxOffsetY, y)),
  });

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!imageSize) return;
    (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
    dragState.current = {
      x: event.clientX,
      y: event.clientY,
      startX: offsetX,
      startY: offsetY,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return;
    const dx = event.clientX - dragState.current.x;
    const dy = event.clientY - dragState.current.y;
    const next = clampOffsets(dragState.current.startX + dx, dragState.current.startY + dy);
    setOffsetX(next.x);
    setOffsetY(next.y);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return;
    (event.currentTarget as HTMLDivElement).releasePointerCapture(event.pointerId);
    dragState.current = null;
  };

  const handleZoomChange = (value: number) => {
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
    setZoom(nextZoom);
    const nextOffsets = clampOffsets(offsetX, offsetY);
    setOffsetX(nextOffsets.x);
    setOffsetY(nextOffsets.y);
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!imageSize) return;
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    handleZoomChange(zoom + delta);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!imageSize) return;
    const step = event.shiftKey ? 12 : 6;
    let nextX = offsetX;
    let nextY = offsetY;
    switch (event.key) {
      case "ArrowUp":
        nextY -= step;
        break;
      case "ArrowDown":
        nextY += step;
        break;
      case "ArrowLeft":
        nextX -= step;
        break;
      case "ArrowRight":
        nextX += step;
        break;
      default:
        return;
    }
    event.preventDefault();
    const clamped = clampOffsets(nextX, nextY);
    setOffsetX(clamped.x);
    setOffsetY(clamped.y);
  };

  const handleSave = async () => {
    if (!imageSrc) return;
    setIsSaving(true);
    setError(null);
    try {
      const crop: CropState = {
        offsetX,
        offsetY,
        zoom,
        cropSize: CROP_SIZE,
      };
      const result = await getCroppedImage(imageSrc, crop);
      await onSave(result);
    } catch (err) {
      console.error(err);
      setError("We couldn't save that image. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !imageSrc) return null;

  const imageStyle = {
    width: displayWidth,
    height: displayHeight,
    transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`,
  } as const;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Edit profile photo"
    >
      <div className="w-full max-w-3xl rounded-2xl border border-[--border] bg-[--surface] p-6 text-[--foreground] shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[--brand]">Edit profile photo</h2>
            <p className="text-xs text-[--foreground]/70">
              Drag to reposition and use the zoom slider to refine the crop.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[--border] px-3 py-1 text-xs font-semibold hover:bg-[--surface]"
            aria-label="Close photo editor"
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-[1fr,220px]">
          <div>
            <div
              className="relative mx-auto h-[320px] w-[320px] overflow-hidden rounded-2xl border border-[--border] bg-black/30"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onWheel={handleWheel}
              onKeyDown={handleKeyDown}
              role="group"
              aria-label="Photo crop area. Drag to move, use arrow keys to reposition."
              tabIndex={0}
            >
              <img
                src={imageSrc}
                alt="Crop preview"
                className="absolute left-1/2 top-1/2 select-none"
                style={imageStyle}
                draggable={false}
              />
              <div className="pointer-events-none absolute inset-0">
                <div
                  className="absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/70"
                  style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)" }}
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <label htmlFor="zoom-range" className="text-xs font-semibold text-[--foreground]">
                Zoom
              </label>
              <input
                id="zoom-range"
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.01}
                value={zoom}
                onChange={(event) => handleZoomChange(Number(event.target.value))}
                className="w-full accent-[--brand]"
              />
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-[--foreground]/70">
                Preview
              </span>
              <div className="relative h-24 w-24 overflow-hidden rounded-full border border-[--border] bg-black/30">
                <img
                  src={imageSrc}
                  alt="Cropped preview"
                  className="absolute left-1/2 top-1/2 select-none"
                  style={{
                    width: displayWidth,
                    height: displayHeight,
                    transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`,
                  }}
                  draggable={false}
                />
              </div>
            </div>

            {error ? <p className="text-xs text-red-500">{error}</p> : null}

            <div className="flex w-full flex-col gap-2">
              <Button
                type="button"
                className="btn-brand w-full"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save photo"}
              </Button>
              <Button
                type="button"
                className="btn-outline-brand w-full"
                onClick={onClose}
                disabled={isSaving}
              >
                Cancel
              </Button>
            </div>
            <p className="text-xs text-[--foreground]/70">
              The crop is saved as a square 512x512 image.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
