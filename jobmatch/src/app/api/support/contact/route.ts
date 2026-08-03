import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendDigestEmail } from "@/lib/notifications/sendDigestEmail";
import { isRateLimited } from "@/lib/rateLimit";
import { SUPPORT_CATEGORIES } from "@/lib/support";

const SUPPORT_EMAIL = "support@colabconnects.app";
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_PER_DAY = 5;

const ContactSupportSchema = z.object({
  category: z.enum(SUPPORT_CATEGORIES),
  message: z.string().trim().min(10, "Tell us a bit more (at least 10 characters).").max(5000),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = ContactSupportSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  if (isRateLimited(`support-contact:${session.user.id}`, MAX_PER_DAY, DAY_MS)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true },
  });
  if (!user?.email) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const { category, message } = parsed.data;
  const requesterLabel = user.name ? `${user.name} <${user.email}>` : user.email;

  const text = [
    `Category: ${category}`,
    `From: ${requesterLabel}`,
    `User ID: ${user.id}`,
    "",
    message,
  ].join("\n");

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
      <h2 style="font-size:18px;margin:0 0 12px;">New support request</h2>
      <p style="font-size:13px;color:#666;margin:0 0 4px;"><strong>Category:</strong> ${category}</p>
      <p style="font-size:13px;color:#666;margin:0 0 4px;"><strong>From:</strong> ${requesterLabel}</p>
      <p style="font-size:13px;color:#666;margin:0 0 20px;"><strong>User ID:</strong> ${user.id}</p>
      <p style="font-size:14px;line-height:1.6;white-space:pre-wrap;margin:0;">${message.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] as string)}</p>
    </div>
  `;

  try {
    await sendDigestEmail({
      to: SUPPORT_EMAIL,
      subject: `[Support] ${category} — ${requesterLabel}`,
      html,
      text,
      replyTo: user.email,
    });
  } catch (error) {
    console.error("Failed to send support request email", error);
    return NextResponse.json(
      { error: "We couldn't send your request. Try again later." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
