import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { hashResetToken } from "@/lib/passwordReset";

const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});

export async function POST(request: Request) {
  const parsed = ResetPasswordSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const { token, password } = parsed.data;

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired. Please request a new one." },
      { status: 400 }
    );
  }

  const hashed = await bcrypt.hash(password, 10);

  // Accounts created without a password (bulk-imported career forum
  // attendees) are "activated" the first time they actually set one here —
  // later resets of an existing password shouldn't touch this date.
  const targetUser = await prisma.user.findUnique({
    where: { id: record.userId },
    select: { password: true },
  });
  const isFirstActivation = !targetUser?.password;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { password: hashed, ...(isFirstActivation ? { activatedAt: new Date() } : {}) },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Clear any other outstanding reset links plus DB-backed sessions. Note:
    // NextAuth here uses JWT sessions, so already-issued JWTs stay valid until
    // they expire — this covers only what the server can revoke.
    prisma.passwordResetToken.deleteMany({
      where: { userId: record.userId, id: { not: record.id } },
    }),
    prisma.session.deleteMany({ where: { userId: record.userId } }),
  ]);

  return NextResponse.json({ success: true });
}
