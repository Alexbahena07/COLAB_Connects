import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  location: z.string().max(300).optional(),
  isVirtual: z.boolean().optional().default(false),
  virtualUrl: z.string().max(500).optional(),
  eventDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
  applicationOpenAt: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
    .optional(),
  applicationCloseAt: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
    .optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED"]).optional().default("DRAFT"),
});

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const events = await prisma.event.findMany({
    orderBy: { eventDate: "desc" },
    include: { _count: { select: { applications: true } } },
  });

  return NextResponse.json({
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      location: e.location,
      isVirtual: e.isVirtual,
      virtualUrl: e.virtualUrl,
      eventDate: e.eventDate.toISOString(),
      applicationOpenAt: e.applicationOpenAt?.toISOString() ?? null,
      applicationCloseAt: e.applicationCloseAt?.toISOString() ?? null,
      status: e.status,
      applicantCount: e._count.applications,
    })),
  });
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const parsed = createEventSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  const event = await prisma.event.create({
    data: {
      title: data.title,
      description: data.description,
      location: data.location || null,
      isVirtual: data.isVirtual,
      virtualUrl: data.virtualUrl || null,
      eventDate: new Date(data.eventDate),
      applicationOpenAt: data.applicationOpenAt ? new Date(data.applicationOpenAt) : null,
      applicationCloseAt: data.applicationCloseAt ? new Date(data.applicationCloseAt) : null,
      status: data.status,
      createdById: guard.userId,
    },
  });

  return NextResponse.json({ event }, { status: 201 });
}
