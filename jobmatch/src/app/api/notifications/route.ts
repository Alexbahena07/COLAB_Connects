import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULT_LIMIT = 8;

const parseLimit = (value: string | null) => {
  if (!value) return DEFAULT_LIMIT;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(parsed), 50);
};

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseLimit(searchParams.get("limit"));

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        job: { select: { id: true, title: true } },
        company: {
          select: {
            id: true,
            name: true,
            companyProfile: { select: { companyName: true } },
          },
        },
      },
    }),
    prisma.notification.count({ where: { userId: session.user.id, readAt: null } }),
  ]);

  const payload = notifications.map((notification) => ({
    id: notification.id,
    type: notification.type,
    jobId: notification.jobId,
    companyId: notification.companyId,
    jobTitle: notification.jobTitle ?? notification.job?.title ?? null,
    companyName:
      notification.company?.companyProfile?.companyName ??
      notification.company?.name ??
      null,
    createdAt: notification.createdAt.toISOString(),
    readAt: notification.readAt ? notification.readAt.toISOString() : null,
  }));

  return NextResponse.json({ notifications: payload, unreadCount });
}

type PatchPayload = { ids?: unknown; markAll?: unknown };

const parseIds = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : [];

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as PatchPayload | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const ids = parseIds(body.ids);
  const markAll = body.markAll === true;

  if (!markAll && ids.length === 0) {
    return NextResponse.json({ error: "No notifications specified" }, { status: 400 });
  }

  const result = await prisma.notification.updateMany({
    where: {
      userId: session.user.id,
      ...(markAll ? { readAt: null } : { id: { in: ids } }),
    },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ updated: result.count });
}
