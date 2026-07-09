import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  sponsorTier: z.enum(["FREE", "SILVER", "GOLD", "PLATINUM"]),
});

const TIER_RANK: Record<string, number> = { FREE: 0, SILVER: 1, GOLD: 2, PLATINUM: 3 };

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { userId } = await params;

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const profile = await prisma.companyProfile.findUnique({ where: { userId }, select: { id: true, sponsorTier: true } });
  if (!profile) {
    return NextResponse.json({ error: "Company profile not found" }, { status: 404 });
  }

  const updated = await prisma.companyProfile.update({
    where: { userId },
    data: { sponsorTier: parsed.data.sponsorTier },
    select: { userId: true, sponsorTier: true },
  });

  if (TIER_RANK[parsed.data.sponsorTier] > TIER_RANK[profile.sponsorTier]) {
    await prisma.notification.create({
      data: { userId, type: "SPONSOR_TIER_UPGRADED", sponsorTier: parsed.data.sponsorTier },
    });
  }

  return NextResponse.json({ company: updated });
}
