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
