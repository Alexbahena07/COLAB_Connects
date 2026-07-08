import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { searchParams } = new URL(request.url);
  const accountType = searchParams.get("accountType");
  const status = searchParams.get("status");
  const flagged = searchParams.get("flagged");
  const q = searchParams.get("q")?.trim();
  const signedUpAfter = searchParams.get("signedUpAfter");
  const signedUpBefore = searchParams.get("signedUpBefore");
  const cursor = searchParams.get("cursor");
  const take = Math.min(Number(searchParams.get("take")) || 50, 100);

  const where: Prisma.UserWhereInput = {};
  if (accountType === "STUDENT" || accountType === "COMPANY") {
    where.accountType = accountType;
  }
  if (status === "ACTIVE" || status === "DEACTIVATED" || status === "BANNED") {
    where.status = status;
  }
  if (flagged === "true") where.flagged = true;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }
  if (signedUpAfter || signedUpBefore) {
    where.createdAt = {
      ...(signedUpAfter ? { gte: new Date(signedUpAfter) } : {}),
      ...(signedUpBefore ? { lte: new Date(signedUpBefore) } : {}),
    };
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      name: true,
      email: true,
      accountType: true,
      status: true,
      isAdmin: true,
      flagged: true,
      flagNote: true,
      createdAt: true,
    },
  });

  const hasMore = users.length > take;
  const page = hasMore ? users.slice(0, take) : users;

  return NextResponse.json({
    users: page.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  });
}
