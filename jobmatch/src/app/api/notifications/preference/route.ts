import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    select: { notificationFrequency: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ frequency: user.notificationFrequency });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { frequency?: unknown } | null;
  if (!body || !isValidFrequency(body.frequency)) {
    return NextResponse.json({ error: "Invalid frequency" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { notificationFrequency: body.frequency },
    select: { notificationFrequency: true },
  });

  return NextResponse.json({ frequency: user.notificationFrequency });
}
