import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendDigestEmail } from "@/lib/notifications/sendDigestEmail";
import { getAppUrl } from "@/lib/passwordReset";

const CHANGE_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const IDENTIFIER_PREFIX = "email-change";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

// identifier layout: "email-change:<userId>:<newEmail>". userId is a cuid
// (no colons), so splitting off the first two segments is unambiguous even
// though an email can technically contain ":".
const buildIdentifier = (userId: string, newEmail: string) =>
  `${IDENTIFIER_PREFIX}:${userId}:${newEmail}`;

const parseIdentifier = (identifier: string): { userId: string; newEmail: string } | null => {
  const [prefix, userId, ...rest] = identifier.split(":");
  if (prefix !== IDENTIFIER_PREFIX || !userId || rest.length === 0) return null;
  return { userId, newEmail: rest.join(":") };
};

// Starts an email change: stores a pending-change token, emails a
// confirmation link to the NEW address, and warns the OLD address so a
// hijacked session can't silently take over the account.
export const issueEmailChangeVerification = async (
  userId: string,
  currentEmail: string | null,
  newEmail: string
) => {
  const token = randomBytes(32).toString("hex");

  await prisma.$transaction([
    // One pending change per user: a new request supersedes any older one.
    prisma.verificationToken.deleteMany({
      where: { identifier: { startsWith: `${IDENTIFIER_PREFIX}:${userId}:` } },
    }),
    prisma.verificationToken.create({
      data: {
        identifier: buildIdentifier(userId, newEmail),
        token: hashToken(token),
        expires: new Date(Date.now() + CHANGE_TOKEN_TTL_MS),
      },
    }),
  ]);

  const confirmUrl = `${getAppUrl()}/confirm-email-change?token=${token}`;

  await sendDigestEmail({
    to: newEmail,
    subject: "Confirm your new email for COLAB Connects",
    text: [
      "A request was made to use this address for a COLAB Connects account.",
      "",
      `Confirm the change: ${confirmUrl}`,
      "",
      "This link expires in 1 hour. If you didn't request this, you can safely ignore this email — nothing will change.",
    ].join("\n"),
    html: `
      <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
        <h2 style="font-size:18px;margin:0 0 12px;">Confirm your new email</h2>
        <p style="font-size:14px;line-height:1.6;margin:0 0 20px;">
          A request was made to use this address for a COLAB Connects account. Click below to confirm the change.
        </p>
        <a href="${confirmUrl}" style="display:inline-block;background:#2f5bff;color:#ffffff;padding:10px 16px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Confirm email change</a>
        <p style="font-size:12px;color:#666;line-height:1.6;margin:20px 0 0;">
          This link expires in 1 hour. If you didn't request this, you can safely ignore this email — nothing will change.
        </p>
      </div>
    `,
  });

  // Heads-up to the current address. Best-effort: the confirmation email is
  // the one that matters for the flow to proceed.
  if (currentEmail) {
    try {
      await sendDigestEmail({
        to: currentEmail,
        subject: "Your COLAB Connects email is being changed",
        text: [
          `A request was made to change your COLAB Connects login email to ${newEmail}.`,
          "",
          "If this was you, confirm it from the email we sent to the new address.",
          "If this wasn't you, change your password immediately — someone may have access to your account.",
        ].join("\n"),
        html: `
          <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
            <h2 style="font-size:18px;margin:0 0 12px;">Email change requested</h2>
            <p style="font-size:14px;line-height:1.6;margin:0 0 12px;">
              A request was made to change your COLAB Connects login email to <strong>${newEmail}</strong>.
            </p>
            <p style="font-size:14px;line-height:1.6;margin:0;">
              If this was you, confirm it from the email we sent to the new address.
              If this wasn't you, change your password immediately — someone may have access to your account.
            </p>
          </div>
        `,
      });
    } catch (error) {
      console.error("Failed to notify old address of email change request", error);
    }
  }
};

type ConsumeResult =
  | { ok: true; newEmail: string }
  | { ok: false; reason: "invalid" | "email-taken" };

// Completes a pending email change. The click proves ownership of the new
// address, so emailVerified is set rather than cleared.
export const consumeEmailChangeToken = async (token: string): Promise<ConsumeResult> => {
  const record = await prisma.verificationToken.findUnique({
    where: { token: hashToken(token) },
  });
  if (!record || record.expires < new Date()) return { ok: false, reason: "invalid" };

  const parsed = parseIdentifier(record.identifier);
  if (!parsed) return { ok: false, reason: "invalid" };

  const user = await prisma.user.findUnique({
    where: { id: parsed.userId },
    select: { email: true },
  });
  if (!user) return { ok: false, reason: "invalid" };

  // Re-check: another account may have claimed the address since the request.
  const taken = await prisma.user.findUnique({ where: { email: parsed.newEmail } });
  if (taken && taken.id !== parsed.userId) {
    await prisma.verificationToken.deleteMany({ where: { identifier: record.identifier } });
    return { ok: false, reason: "email-taken" };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: parsed.userId },
      data: { email: parsed.newEmail, emailVerified: new Date() },
    }),
    prisma.verificationToken.deleteMany({
      where: { identifier: { startsWith: `${IDENTIFIER_PREFIX}:${parsed.userId}:` } },
    }),
  ]);

  // Completion notice to the old address.
  if (user.email && user.email !== parsed.newEmail) {
    try {
      await sendDigestEmail({
        to: user.email,
        subject: "Your COLAB Connects email was changed",
        text: [
          `Your COLAB Connects login email is now ${parsed.newEmail}.`,
          "",
          "If you didn't make this change, contact support immediately.",
        ].join("\n"),
        html: `
          <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
            <h2 style="font-size:18px;margin:0 0 12px;">Email changed</h2>
            <p style="font-size:14px;line-height:1.6;margin:0;">
              Your COLAB Connects login email is now <strong>${parsed.newEmail}</strong>.
              If you didn't make this change, contact support immediately.
            </p>
          </div>
        `,
      });
    } catch (error) {
      console.error("Failed to notify old address of completed email change", error);
    }
  }

  return { ok: true, newEmail: parsed.newEmail };
};
