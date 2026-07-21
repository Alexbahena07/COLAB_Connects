const HEIC_TYPES = new Set(["image/heic", "image/heif"]);

// iPhones default to HEIC, but no mainstream browser can decode HEIC inside
// an <img> or <canvas> — only the OS Photos app can. iOS also doesn't always
// report a usable MIME type for these files (file.type is sometimes blank),
// so the extension is checked as a fallback.
const isHeic = (file: File) =>
  HEIC_TYPES.has(file.type.toLowerCase()) || /\.(heic|heif)$/i.test(file.name);

const MAX_DIMENSION = 1600;

// HEIC compresses noticeably better than JPEG, so re-encoding a phone photo
// at full resolution can end up *larger* than the HEIC original — capping
// the longest side keeps uploads well under server-side size limits
// regardless of the camera's native resolution.
async function downscaleIfNeeded(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
    bitmap.close();
    return file;
  }

  const scale = MAX_DIMENSION / Math.max(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85)
  );
  if (!blob) return file;

  const newName = file.name.replace(/\.\w+$/, "") + ".jpg";
  return new File([blob], newName, { type: "image/jpeg" });
}

// Converts a HEIC/HEIF file to JPEG client-side and caps its dimensions, so
// the rest of the app (previews, cropping, storage) only ever has to deal
// with a normal, reasonably-sized image format. Other formats pass through
// unless they're oversized.
export async function normalizeImageFile(file: File): Promise<File> {
  let working = file;

  if (isHeic(file)) {
    const heic2any = (await import("heic2any")).default;
    const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
    const blob = Array.isArray(result) ? result[0] : result;
    const newName = file.name.replace(/\.(heic|heif)$/i, "") + ".jpg";
    working = new File([blob], newName, { type: "image/jpeg" });
  }

  try {
    return await downscaleIfNeeded(working);
  } catch (err) {
    console.error("Failed to downscale image, using original", err);
    return working;
  }
}
