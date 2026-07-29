const HEIC_TYPES = new Set(["image/heic", "image/heif"]);

// iPhones default to HEIC, but most browsers can't decode HEIC inside an
// <img> or <canvas>. iOS also doesn't always report a usable MIME type for
// these files (file.type is sometimes blank), so the extension is checked
// as a fallback.
const isHeic = (file: File) =>
  HEIC_TYPES.has(file.type.toLowerCase()) || /\.(heic|heif)$/i.test(file.name);

const MAX_DIMENSION = 1600;

// HEIC compresses noticeably better than JPEG, so re-encoding a phone photo
// at full resolution can end up *larger* than the HEIC original — capping
// the longest side keeps uploads well under server-side size limits
// regardless of the camera's native resolution.
function bitmapToJpegFile(bitmap: ImageBitmap, name: string, quality: number): Promise<File> {
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas not supported");
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to encode image"));
        return;
      }
      resolve(new File([blob], name, { type: "image/jpeg" }));
    }, "image/jpeg", quality);
  });
}

// Safari on iOS/macOS decodes virtually every HEIC/HEIF variant Apple's
// cameras produce (HDR, burst/live-photo containers, etc.) via the OS's own
// ImageIO framework — no JS decoder needed. Try that path first; it also
// covers files that heic2any's bundled libheif build doesn't recognize.
async function tryNativeDecode(file: File, jpegName: string): Promise<File | null> {
  try {
    const bitmap = await createImageBitmap(file);
    return await bitmapToJpegFile(bitmap, jpegName, 0.9);
  } catch {
    return null;
  }
}

async function decodeHeicWithLibrary(file: File, jpegName: string): Promise<File> {
  const heic2any = (await import("heic2any")).default;
  const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
  const blob = Array.isArray(result) ? result[0] : result;
  return new File([blob], jpegName, { type: "image/jpeg" });
}

async function downscaleIfNeeded(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  if (bitmap.width <= MAX_DIMENSION && bitmap.height <= MAX_DIMENSION) {
    bitmap.close();
    return file;
  }
  const newName = file.name.replace(/\.\w+$/, "") + ".jpg";
  return bitmapToJpegFile(bitmap, newName, 0.85);
}

// Converts a HEIC/HEIF file to JPEG client-side and caps its dimensions, so
// the rest of the app (previews, cropping, storage) only ever has to deal
// with a normal, reasonably-sized image format. Other formats pass through
// unless they're oversized. Throws if the file truly can't be decoded by
// either the browser's native decoder or the JS fallback.
export async function normalizeImageFile(file: File): Promise<File> {
  if (isHeic(file)) {
    const jpegName = file.name.replace(/\.(heic|heif)$/i, "") + ".jpg";
    const native = await tryNativeDecode(file, jpegName);
    if (native) return native;

    // Native decode isn't available (most non-Safari browsers) or this
    // particular HEIC variant isn't one the browser recognizes — fall back
    // to the JS/WASM decoder. It doesn't cover every variant either, so
    // this can still throw; callers should show the user a clear error.
    const converted = await decodeHeicWithLibrary(file, jpegName);
    return downscaleIfNeeded(converted);
  }

  try {
    return await downscaleIfNeeded(file);
  } catch (err) {
    console.error("Failed to downscale image, using original", err);
    return file;
  }
}
