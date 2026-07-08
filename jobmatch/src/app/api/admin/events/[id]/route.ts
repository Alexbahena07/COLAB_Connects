import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  location: z.string().max(300).nullable().optional(),
  isVirtual: z.boolean().optional(),
  virtualUrl: z.string().max(500).nullable().optional(),
  eventDate: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
    .optional(),
  applicationOpenAt: z
    .string()
    .nullable()
    .refine((v) => v === null || !Number.isNaN(Date.parse(v)), "Invalid date")
    .optional(),
  applicationCloseAt: z
    .string()
    .nullable()
    .refine((v) => v === null || !Number.isNaN(Date.parse(v)), "Invalid date")
    .optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED"]).optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  return NextResponse.json({ event });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id } = await params;
  const parsed = updateEventSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.event.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const data = parsed.data;
  const event = await prisma.event.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.location !== undefined ? { location: data.location } : {}),
      ...(data.isVirtual !== undefined ? { isVirtual: data.isVirtual } : {}),
      ...(data.virtualUrl !== undefined ? { virtualUrl: data.virtualUrl } : {}),
      ...(data.eventDate !== undefined ? { eventDate: new Date(data.eventDate) } : {}),
      ...(data.applicationOpenAt !== undefined
        ? { applicationOpenAt: data.applicationOpenAt ? new Date(data.applicationOpenAt) : null }
        : {}),
      ...(data.applicationCloseAt !== undefined
        ? { applicationCloseAt: data.applicationCloseAt ? new Date(data.applicationCloseAt) : null }
        : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
  });

  return NextResponse.json({ event });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id } = await params;
  const existing = await prisma.event.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  await prisma.event.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
