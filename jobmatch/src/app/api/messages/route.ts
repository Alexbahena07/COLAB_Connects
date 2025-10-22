import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

type MessageRequestPayload = {
  applicantId: string;
  applicantEmail?: string | null;
  applicantName?: string | null;
  message: string;
};

const messagingApiUrl = process.env.MESSAGING_API_URL;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Partial<MessageRequestPayload> | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const { applicantId, applicantEmail, applicantName, message } = body;

  if (!applicantId || typeof applicantId !== "string") {
    return NextResponse.json({ error: "Missing applicant identifier" }, { status: 400 });
  }

  if (!message || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "Message body is required" }, { status: 400 });
  }

  if (!messagingApiUrl) {
    console.error("MESSAGING_API_URL is not configured. Set it in your environment.");
    return NextResponse.json({ error: "Messaging service not configured" }, { status: 500 });
  }

  const payload = {
    senderId: user.id,
    senderEmail: user.email ?? null,
    applicantId,
    applicantEmail: applicantEmail ?? null,
    applicantName: applicantName ?? null,
    message: message.trim(),
  };

  try {
    const response = await fetch(messagingApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
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
