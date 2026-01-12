// src/app/api/jobs/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const updateJobSchema = z.object({
  title: z.string().min(1).max(200),
  location: z.string().min(1).max(200),
  type: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"]),
  remote: z.boolean(),
  description: z.string().min(1),
  skills: z.array(z.string().min(1).max(100)).optional().default([]),
});

const normalizeSkills = (skills: string[]) =>
  Array.from(
    new Set(
      skills
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    )
  );

// ----------------------------------------
// PATCH - Update Job
// ----------------------------------------
export async function PATCH(request: Request, context: RouteContext) {
  const { id: jobId } = await context.params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, accountType: true },
  });

  if (!companyUser || companyUser.accountType !== "COMPANY") {
    return NextResponse.json(
      { error: "Only company accounts can update jobs" },
      { status: 403 }
    );
  }

  const existingJob = await prisma.job.findUnique({
    where: { id: jobId },
    select: { companyId: true },
  });

  if (!existingJob) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (existingJob.companyId !== companyUser.id) {
    return NextResponse.json(
      { error: "You can only edit your own jobs" },
      { status: 403 }
    );
  }

  const parsed = updateJobSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { title, location, type, remote, description, skills = [] } =
    parsed.data;

  const uniqueSkills = normalizeSkills(skills);

  try {
    const updatedJobId = await prisma.$transaction(async (tx) => {
      await tx.job.update({
        where: { id: jobId },
        data: { title, location, type, remote, description },
      });

      await tx.jobSkill.deleteMany({ where: { jobId } });

      if (uniqueSkills.length > 0) {
        const skillRecords = await Promise.all(
          uniqueSkills.map((name) =>
            tx.skill.upsert({
              where: { name },
              update: {},
              create: { name },
            })
          )
        );

        await tx.jobSkill.createMany({
          data: skillRecords.map((skill) => ({
            jobId,
            skillId: skill.id,
          })),
        });
      }

      return jobId;
    });

    const updatedJob = await prisma.job.findUnique({
      where: { id: updatedJobId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            companyProfile: { select: { companyName: true } },
          },
        },
        skills: { include: { skill: true } },
      },
    });

    if (!updatedJob) {
      return NextResponse.json(
        { error: "Job updated but cannot be fetched" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      job: {
        id: updatedJob.id,
        title: updatedJob.title,
        companyId: updatedJob.company.id,
        company:
          updatedJob.company.companyProfile?.companyName ||
          updatedJob.company.name ||
          "Unknown company",
        location: updatedJob.location,
        type: updatedJob.type,
        remote: updatedJob.remote,
        description: updatedJob.description,
        postedAt: updatedJob.postedAt.toISOString(),
        skills: updatedJob.skills.map((js) => js.skill.name),
      },
    });
  } catch (err) {
    console.error("Failed to update job", err);
    return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
  }
}

// ----------------------------------------
// DELETE - Delete Job
// ----------------------------------------
export async function DELETE(_request: Request, context: RouteContext) {
  const { id: jobId } = await context.params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, accountType: true },
  });

  if (!companyUser || companyUser.accountType !== "COMPANY") {
    return NextResponse.json(
      { error: "Only company accounts can delete jobs" },
      { status: 403 }
    );
  }

  const existingJob = await prisma.job.findUnique({
    where: { id: jobId },
    select: { companyId: true },
  });

  if (!existingJob) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (existingJob.companyId !== companyUser.id) {
    return NextResponse.json(
      { error: "You can only delete your own jobs" },
      { status: 403 }
    );
  }

  try {
    await prisma.job.delete({ where: { id: jobId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to delete job", err);
    return NextResponse.json({ error: "Failed to delete job" }, { status: 500 });
  }
}
