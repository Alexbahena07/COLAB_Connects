import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  status: z.enum(["ACTIVE", "DEACTIVATED", "BANNED"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id } = await params;

  if (id === guard.userId) {
    return NextResponse.json(
      { error: "You cannot change your own account status" },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { status: parsed.data.status },
    select: { id: true, status: true },
  });

  return NextResponse.json({ user: updated });
}
