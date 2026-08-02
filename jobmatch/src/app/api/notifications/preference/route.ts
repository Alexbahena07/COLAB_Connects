import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireActiveStatus } from "@/lib/auth-guards";

type NotificationFrequency = "NONE" | "DAILY" | "WEEKLY";

const isValidFrequency = (value: unknown): value is NotificationFrequency =>
  value === "NONE" || value === "DAILY" || value === "WEEKLY";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { notificationFrequency: true, newsletterOptIn: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    frequency: user.notificationFrequency,
    newsletterOptIn: user.newsletterOptIn,
  });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const statusError = await requireActiveStatus(session.user.id);
  if (statusError) return statusError;

  const body = (await request.json().catch(() => null)) as
    | { frequency?: unknown; newsletterOptIn?: unknown }
    | null;

  if (!body || (body.frequency === undefined && body.newsletterOptIn === undefined)) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  if (body.frequency !== undefined && !isValidFrequency(body.frequency)) {
    return NextResponse.json({ error: "Invalid frequency" }, { status: 400 });
  }
  if (body.newsletterOptIn !== undefined && typeof body.newsletterOptIn !== "boolean") {
    return NextResponse.json({ error: "Invalid newsletterOptIn" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(body.frequency !== undefined ? { notificationFrequency: body.frequency } : {}),
      ...(body.newsletterOptIn !== undefined ? { newsletterOptIn: body.newsletterOptIn } : {}),
    },
    select: { notificationFrequency: true, newsletterOptIn: true },
  });

  return NextResponse.json({
    frequency: user.notificationFrequency,
    newsletterOptIn: user.newsletterOptIn,
  });
}
