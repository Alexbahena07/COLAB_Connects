import { createHash, randomBytes } from "crypto";
import { sendDigestEmail } from "@/lib/notifications/sendDigestEmail";

export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

const DEFAULT_APP_URL = "http://localhost:3000";

// Falls back to Vercel's auto-populated deployment URL when NEXT_PUBLIC_APP_URL/
// APP_URL aren't configured, so a missing env var can't silently emit
// localhost links from a production deployment.
export const getAppUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.APP_URL) return process.env.APP_URL;
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;
  return DEFAULT_APP_URL;
};

export const generateResetToken = () => randomBytes(32).toString("hex");

// Only the hash is persisted; a leaked DB row can't be replayed as a reset link.
export const hashResetToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export const sendPasswordResetEmail = async (to: string, token: string) => {
  const resetUrl = `${getAppUrl()}/reset-password?token=${token}`;

  const text = [
    "We received a request to reset your COLAB Connects password.",
    "",
    `Reset your password: ${resetUrl}`,
    "",
    "This link expires in 30 minutes. If you didn't request a reset, you can safely ignore this email — your password will not change.",
  ].join("\n");

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
      <h2 style="font-size:18px;margin:0 0 12px;">Reset your password</h2>
      <p style="font-size:14px;line-height:1.6;margin:0 0 20px;">
        We received a request to reset your COLAB Connects password. Click the button below to choose a new one.
      </p>
      <a href="${resetUrl}" style="display:inline-block;background:#2f5bff;color:#ffffff;padding:10px 16px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Reset password</a>
      <p style="font-size:12px;color:#666;line-height:1.6;margin:20px 0 0;">
        This link expires in 30 minutes. If you didn't request a reset, you can safely ignore this email — your password will not change.
      </p>
    </div>
  `;

  await sendDigestEmail({
    to,
    subject: "Reset your COLAB Connects password",
    html,
    text,
  });
};
