import { put, del } from "@vercel/blob";
import { randomUUID } from "crypto";

export const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const isAllowedAvatarType = (contentType: string): boolean =>
  (ALLOWED_AVATAR_TYPES as readonly string[]).includes(contentType);

// Avatars live in a separate, public-access Blob store from resumes (which
// must stay private) — its token isn't the project default, so it's passed
// explicitly on every call rather than relying on BLOB_READ_WRITE_TOKEN.
const avatarBlobToken = () => {
  const token = process.env.AVATAR_BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("AVATAR_BLOB_READ_WRITE_TOKEN is not set");
  return token;
};

// Each upload gets a random suffix so its URL is immutable and safely
// browser-cacheable; replacing a photo naturally busts the cache since
// callers store the new URL. The old blob is deleted separately (see below).
export async function uploadAvatarBlob(userId: string, data: Blob | Buffer, contentType: string) {
  const extension = EXTENSION_BY_TYPE[contentType] ?? "jpg";
  const blob = await put(`avatars/${userId}-${randomUUID()}.${extension}`, data, {
    access: "public",
    contentType,
    token: avatarBlobToken(),
  });
  return blob.url;
}

// Best-effort cleanup of the previous avatar blob. Swallows errors so a
// failed delete (already gone, legacy base64 value, etc.) never blocks the
// request that's replacing it.
export async function deleteAvatarBlobIfManaged(url: string | null | undefined) {
  if (!url || !url.includes("/avatars/")) return;
  try {
    await del(url, { token: avatarBlobToken() });
  } catch (error) {
    console.error("Failed to delete previous avatar blob", error);
  }
}
