import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  status: z.enum(["SUBMITTED", "ACCEPTED", "WAITLISTED", "REJECTED"]).optional(),
  notes: z.string().max(2000).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; appId: string }> }
) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id: eventId, appId } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const existing = await prisma.eventApplication.findFirst({
    where: { id: appId, eventId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const updated = await prisma.eventApplication.update({
    where: { id: appId },
    data: {
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
    },
  });

  return NextResponse.json({ application: updated });
}
