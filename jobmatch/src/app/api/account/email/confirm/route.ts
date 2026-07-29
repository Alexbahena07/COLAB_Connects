import { NextResponse } from "next/server";
import { z } from "zod";
import { consumeEmailChangeToken } from "@/lib/emailChange";

const ConfirmSchema = z.object({
  token: z.string().min(1),
});

// Deliberately session-free: the link lands in the NEW inbox, often opened in
// a browser with no active session. Possession of the unexpired token is the
// proof (the request itself was already password-authenticated).
export async function POST(request: Request) {
  const parsed = ConfirmSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const result = await consumeEmailChangeToken(parsed.data.token);

  if (!result.ok) {
    const message =
      result.reason === "email-taken"
        ? "That email address has since been taken by another account."
        : "This confirmation link is invalid or has expired. Please request the change again.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ success: true, newEmail: result.newEmail });
}
