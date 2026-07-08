import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RequireAdminResult =
  | { userId: string; error?: undefined }
  | { userId?: undefined; error: NextResponse };

export async function requireAdmin(): Promise<RequireAdminResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true, status: true },
  });

  if (!user?.isAdmin || user.status !== "ACTIVE") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { userId: session.user.id };
}

/**
 * A signed-in user's JWT only reflects `status` as of their last sign-in, so a
 * user who gets deactivated/banned mid-session would otherwise keep write access
 * until their token naturally expires. Call this with the session's user id at
 * the top of any mutating route to re-check status against the database on
 * every request. Returns a ready-to-return NextResponse on failure, or null.
 */
export async function requireActiveStatus(userId: string): Promise<NextResponse | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true },
  });

  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Your account is not active" }, { status: 403 });
  }

  return null;
}
