import { NextResponse } from "next/server";
import { buildDigests, DigestFrequency, markEventsEmailed } from "@/lib/notifications/digest";
import { sendDigestEmail } from "@/lib/notifications/sendDigestEmail";

const isValidFrequency = (value: unknown): value is DigestFrequency =>
  value === "DAILY" || value === "WEEKLY";

const parseCommit = (value: unknown) => value === true || value === "true";

const requireSecret = (request: Request) => {
  const secret = process.env.DIGEST_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Digest secret not configured" }, { status: 500 });
  }
  if (request.headers.get("x-digest-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
};

export async function GET(request: Request) {
  const unauthorized = requireSecret(request);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const frequency = searchParams.get("frequency");
  if (!isValidFrequency(frequency)) {
    return NextResponse.json({ error: "Invalid frequency" }, { status: 400 });
  }
  const commit = parseCommit(searchParams.get("commit"));
  const digests = await buildDigests(frequency);
  const sentEventIds: string[] = [];
  let sent = 0;
  let failed = 0;

  for (const digest of digests) {
    try {
      await sendDigestEmail({
        to: digest.email,
        subject: digest.subject,
        html: digest.html,
        text: digest.text,
      });
      sent += 1;
      if (commit) {
        sentEventIds.push(...digest.eventIds);
      }
    } catch (error) {
      failed += 1;
      console.error("Failed to send digest email", { userId: digest.userId, error });
    }
  }

  if (commit && sentEventIds.length > 0) {
    await markEventsEmailed(sentEventIds);
  }

  return NextResponse.json({
    frequency,
    commit,
    count: digests.length,
    sent,
    failed,
    digests,
  });
}

export async function POST(request: Request) {
  const unauthorized = requireSecret(request);
  if (unauthorized) return unauthorized;

  const body = (await request.json().catch(() => null)) as {
    frequency?: unknown;
    commit?: unknown;
  } | null;

  if (!body || !isValidFrequency(body.frequency)) {
    return NextResponse.json({ error: "Invalid frequency" }, { status: 400 });
  }

  const commit = parseCommit(body.commit);
  const digests = await buildDigests(body.frequency);
  const sentEventIds: string[] = [];
  let sent = 0;
  let failed = 0;

  for (const digest of digests) {
    try {
      await sendDigestEmail({
        to: digest.email,
        subject: digest.subject,
        html: digest.html,
        text: digest.text,
      });
      sent += 1;
      if (commit) {
        sentEventIds.push(...digest.eventIds);
      }
    } catch (error) {
      failed += 1;
      console.error("Failed to send digest email", { userId: digest.userId, error });
    }
  }

  if (commit && sentEventIds.length > 0) {
    await markEventsEmailed(sentEventIds);
  }

  return NextResponse.json({
    frequency: body.frequency,
    commit,
    count: digests.length,
    sent,
    failed,
    digests,
  });
}
