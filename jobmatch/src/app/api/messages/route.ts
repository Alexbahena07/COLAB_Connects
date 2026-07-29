import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireActiveStatus } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { isRateLimited } from "@/lib/rateLimit";

type MessageRequestPayload = {
  applicantId: string;
  message: string;
};

const MAX_MESSAGE_LENGTH = 5000;

const messagingApiUrl = process.env.MESSAGING_API_URL;
const messagingApiSecret = process.env.MESSAGING_API_SECRET;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const statusError = await requireActiveStatus(user.id);
  if (statusError) return statusError;

  const sender = await prisma.user.findUnique({
    where: { id: user.id },
    select: { accountType: true, email: true },
  });
  if (sender?.accountType !== "COMPANY") {
    return NextResponse.json(
      { error: "Only company accounts can send messages" },
      { status: 403 }
    );
  }

  if (isRateLimited(`messages:${user.id}`, 20)) {
    return NextResponse.json(
      { error: "Too many messages. Please try again later." },
      { status: 429 }
    );
  }

  const body = (await request.json().catch(() => null)) as Partial<MessageRequestPayload> | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const { applicantId, message } = body;

  if (!applicantId || typeof applicantId !== "string") {
    return NextResponse.json({ error: "Missing applicant identifier" }, { status: 400 });
  }

  if (!message || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "Message body is required" }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Message must be under ${MAX_MESSAGE_LENGTH} characters` },
      { status: 400 }
    );
  }

  // The sender may only message people who actually applied to one of their
  // jobs, and the recipient's contact details come from our own records —
  // the client never chooses the destination address.
  const application = await prisma.jobApplication.findFirst({
    where: {
      applicantId,
      job: { companyId: user.id },
    },
    select: {
      applicant: { select: { id: true, email: true, name: true } },
    },
  });
  if (!application) {
    return NextResponse.json(
      { error: "You can only message candidates who applied to your jobs" },
      { status: 403 }
    );
  }

  if (!messagingApiUrl) {
    console.error("MESSAGING_API_URL is not configured. Set it in your environment.");
    return NextResponse.json({ error: "Messaging service not configured" }, { status: 500 });
  }
  if (!messagingApiSecret) {
    console.error("MESSAGING_API_SECRET is not configured. Set it in your environment.");
    return NextResponse.json({ error: "Messaging service not configured" }, { status: 500 });
  }

  const payload = {
    senderId: user.id,
    senderEmail: sender.email ?? null,
    applicantId: application.applicant.id,
    applicantEmail: application.applicant.email,
    applicantName: application.applicant.name,
    message: message.trim(),
  };

  try {
    const response = await fetch(messagingApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        // Shared secret so the downstream service can reject calls that
        // didn't come through this authenticated route.
        Authorization: `Bearer ${messagingApiSecret}`,
      },
      body: JSON.stringify(payload),
    });

    const responsePayload = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage =
        typeof responsePayload?.error === "string"
          ? responsePayload.error
          : `Messaging API returned ${response.status}`;
      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }

    const successMessage =
      typeof responsePayload?.message === "string"
        ? responsePayload.message
        : "Message sent successfully.";

    return NextResponse.json({
      message: successMessage,
      metadata: responsePayload,
    });
  } catch (error) {
    console.error("Failed to reach messaging API", error);
    return NextResponse.json({ error: "Failed to reach messaging service" }, { status: 502 });
  }
}
