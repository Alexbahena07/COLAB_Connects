import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  RESET_TOKEN_TTL_MS,
  generateResetToken,
  hashResetToken,
  sendPasswordResetEmail,
} from "@/lib/passwordReset";
import { isRateLimited, requestIp } from "@/lib/rateLimit";

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

const MAX_PER_IP = 5;
const MAX_PER_EMAIL = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_PER_EMAIL_PER_DAY = 5;
const MAX_PER_IP_PER_DAY = 10;

export async function POST(request: Request) {
  const parsed = ForgotPasswordSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const ip = requestIp(request);

  if (
    isRateLimited(`reset:ip:${ip}`, MAX_PER_IP) ||
    isRateLimited(`reset:email:${email}`, MAX_PER_EMAIL) ||
    isRateLimited(`reset:day:ip:${ip}`, MAX_PER_IP_PER_DAY, DAY_MS) ||
    isRateLimited(`reset:day:email:${email}`, MAX_PER_EMAIL_PER_DAY, DAY_MS)
  ) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  // Always return success below this point, whether or not the account exists,
  // so the endpoint can't be used to probe for registered emails.
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, status: true },
  });

  if (user && user.status === "ACTIVE") {
    const token = generateResetToken();

    // One live token per user: issuing a new link invalidates older ones.
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashResetToken(token),
          expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      }),
    ]);

    try {
      await sendPasswordResetEmail(email, token);
    } catch (error) {
      // Swallow so the response stays indistinguishable from the no-account case.
      console.error("Failed to send password reset email", error);
    }
  }

  return NextResponse.json({ success: true });
}
