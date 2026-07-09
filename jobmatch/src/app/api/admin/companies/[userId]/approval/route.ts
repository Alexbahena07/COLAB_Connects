import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "PENDING"]),
});

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

  const profile = await prisma.companyProfile.findUnique({ where: { userId }, select: { id: true, approvalStatus: true } });
  if (!profile) {
    return NextResponse.json({ error: "Company profile not found" }, { status: 404 });
  }

  const updated = await prisma.companyProfile.update({
    where: { userId },
    data: {
      approvalStatus: parsed.data.status,
      approvedAt: new Date(),
      approvedById: guard.userId,
    },
    select: { userId: true, approvalStatus: true, approvedAt: true },
  });

  if (parsed.data.status === "APPROVED" && profile.approvalStatus !== "APPROVED") {
    await prisma.notification.create({
      data: { userId, type: "COMPANY_APPROVED" },
    });
  }

  return NextResponse.json({ company: updated });
}
