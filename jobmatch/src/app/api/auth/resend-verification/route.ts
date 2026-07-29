import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { issueVerificationEmail } from "@/lib/emailVerification";
import { isRateLimited, requestIp } from "@/lib/rateLimit";

const ResendSchema = z.object({
  email: z.string().email(),
});

const MAX_PER_IP = 5;
const MAX_PER_EMAIL = 3;

export async function POST(request: Request) {
  const parsed = ResendSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const ip = requestIp(request);

  if (isRateLimited(`verify:ip:${ip}`, MAX_PER_IP) || isRateLimited(`verify:email:${email}`, MAX_PER_EMAIL)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  // Always return success whether or not the account exists (or is already
  // verified), so this can't be used to probe registered emails.
  const user = await prisma.user.findUnique({
    where: { email },
    select: { emailVerified: true, status: true },
  });

  if (user && !user.emailVerified && user.status === "ACTIVE") {
    try {
      await issueVerificationEmail(email);
    } catch (error) {
      console.error("Failed to send verification email", error);
    }
  }

  return NextResponse.json({ success: true });
}
