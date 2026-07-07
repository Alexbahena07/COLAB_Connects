import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const Schema = z.object({ openToWork: z.boolean() });

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.accountType !== "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    await prisma.profile.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, openToWork: parsed.data.openToWork },
      update: { openToWork: parsed.data.openToWork },
    });
  } catch (error) {
    console.error("Failed to update openToWork", error);
    return NextResponse.json({ error: "Failed to save. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ openToWork: parsed.data.openToWork });
}
