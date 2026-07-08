import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id: eventId } = await params;

  const applications = await prisma.eventApplication.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
    include: {
      applicant: {
        select: {
          id: true,
          name: true,
          email: true,
          profile: { select: { headline: true, desiredLocation: true } },
        },
      },
    },
  });

  return NextResponse.json({
    applications: applications.map((a) => ({
      id: a.id,
      status: a.status,
      notes: a.notes,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      applicant: {
        id: a.applicant.id,
        name: a.applicant.name,
        email: a.applicant.email,
        headline: a.applicant.profile?.headline ?? null,
        desiredLocation: a.applicant.profile?.desiredLocation ?? null,
      },
    })),
  });
}

const addSchema = z.object({
  applicantId: z.string().min(1),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id: eventId } = await params;
  const parsed = addSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const applicant = await prisma.user.findUnique({
    where: { id: parsed.data.applicantId },
    select: { id: true, accountType: true },
  });
  if (!applicant || applicant.accountType !== "STUDENT") {
    return NextResponse.json({ error: "Applicant must be an existing student account" }, { status: 400 });
  }

  try {
    const application = await prisma.eventApplication.create({
      data: { eventId, applicantId: parsed.data.applicantId },
      include: { applicant: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This student has already applied to this event" }, { status: 409 });
    }
    console.error("Failed to add event applicant", error);
    return NextResponse.json({ error: "Failed to add applicant" }, { status: 500 });
  }
}
