import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id } = await params;

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const job = await prisma.job.findUnique({ where: { id }, select: { id: true } });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const updated = await prisma.job.update({
    where: { id },
    data: {
      status: parsed.data.status,
      reviewedAt: new Date(),
      reviewedById: guard.userId,
    },
    select: { id: true, status: true, reviewedAt: true },
  });

  return NextResponse.json({ job: updated });
}
