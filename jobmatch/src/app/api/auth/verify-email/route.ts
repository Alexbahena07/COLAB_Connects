import { NextResponse } from "next/server";
import { z } from "zod";
import { consumeVerificationToken } from "@/lib/emailVerification";

const VerifyEmailSchema = z.object({
  token: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = VerifyEmailSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const verified = await consumeVerificationToken(parsed.data.token);
  if (!verified) {
    return NextResponse.json(
      { error: "This verification link is invalid or has expired. Please request a new one." },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
