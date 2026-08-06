import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendDigestEmail } from "@/lib/notifications/sendDigestEmail";
import { getAppUrl } from "@/lib/passwordReset";

const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

// Creates a fresh verification token for the email (replacing any outstanding
// one) and sends the link. Uses NextAuth's VerificationToken table: identifier
// holds the email, token holds the SHA-256 hash so a DB leak can't be replayed.
export const issueVerificationEmail = async (email: string) => {
  const token = randomBytes(32).toString("hex");

  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier: email } }),
    prisma.verificationToken.create({
      data: {
        identifier: email,
        token: hashToken(token),
        expires: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
      },
    }),
  ]);

  const verifyUrl = `${getAppUrl()}/verify-email?token=${token}`;

  const text = [
    "Welcome to COLAB Connects!",
    "",
    `Verify your email address: ${verifyUrl}`,
    "",
    "This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.",
  ].join("\n");

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
      <h2 style="font-size:18px;margin:0 0 12px;">Verify your email</h2>
      <p style="font-size:14px;line-height:1.6;margin:0 0 20px;">
        Welcome to COLAB Connects! Click the button below to verify your email address and activate your account.
      </p>
      <a href="${verifyUrl}" style="display:inline-block;background:#2f5bff;color:#ffffff;padding:10px 16px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Verify email</a>
      <p style="font-size:12px;color:#666;line-height:1.6;margin:20px 0 0;">
        This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
      </p>
    </div>
  `;

  await sendDigestEmail({
    to: email,
    subject: "Verify your email for COLAB Connects",
    html,
    text,
  });
};

// Consumes a verification token. Returns true if a user was verified.
export const consumeVerificationToken = async (token: string) => {
  const record = await prisma.verificationToken.findUnique({
    where: { token: hashToken(token) },
  });
  if (!record || record.expires < new Date()) return false;

  const [{ count: verifiedCount }] = await prisma.$transaction([
    prisma.user.updateMany({
      where: { email: record.identifier, emailVerified: null },
      data: { emailVerified: new Date() },
    }),
    prisma.verificationToken.deleteMany({ where: { identifier: record.identifier } }),
  ]);

  // count is 0 if the user was already verified (e.g. a repeat click) — only
  // a genuine unverified-to-verified transition counts toward the lifetime
  // signup metric, which never decrements and otherwise survives deletions.
  if (verifiedCount > 0) {
    await prisma.appStats.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", totalUsersCreated: 1 },
      update: { totalUsersCreated: { increment: 1 } },
    });
  }

  return true;
};
