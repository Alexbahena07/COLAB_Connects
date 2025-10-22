import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const updateJobSchema = z.object({
  title: z.string().min(1).max(200),
  location: z.string().min(1).max(200),
  type: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"]),
  remote: z.boolean(),
  description: z.string().min(1),
  skills: z.array(z.string().min(1).max(100)).optional().default([]),
});

const normalizeSkills = (skills: string[]) =>
  Array.from(new Set(skills.map((skill) => skill.trim()).filter((skill) => skill.length > 0)));

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, accountType: true },
  });

  if (!companyUser || companyUser.accountType !== "COMPANY") {
    return NextResponse.json({ error: "Only company accounts can update jobs" }, { status: 403 });
  }

  const jobId = params?.id;
  if (!jobId) {
    return NextResponse.json({ error: "Job id is required" }, { status: 400 });
  }

  const existingJob = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, companyId: true },
  });

  if (!existingJob) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (existingJob.companyId !== companyUser.id) {
    return NextResponse.json({ error: "You can only edit your own jobs" }, { status: 403 });
  }

  const parsedPayload = updateJobSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsedPayload.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsedPayload.error.flatten() }, { status: 400 });
  }

  const { title, location, type, remote, description, skills = [] } = parsedPayload.data;
  const uniqueSkills = normalizeSkills(skills);

  try {
    const updatedJobId = await prisma.$transaction(async (tx) => {
      await tx.job.update({
        where: { id: jobId },
        data: {
          title,
          location,
          type,
          remote,
          description,
        },
      });

      await tx.jobSkill.deleteMany({ where: { jobId } });

      if (uniqueSkills.length > 0) {
        const skillRecords = await Promise.all(
          uniqueSkills.map((skillName) =>
            tx.skill.upsert({
              where: { name: skillName },
              update: {},
              create: { name: skillName },
            })
          )
        );

        if (skillRecords.length > 0) {
          await tx.jobSkill.createMany({
            data: skillRecords.map((skill) => ({
              jobId,
              skillId: skill.id,
            })),
          });
        }
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
            companyProfile: {
              select: {
                companyName: true,
              },
            },
          },
        },
        skills: {
          include: {
            skill: true,
          },
        },
      },
    });

    if (!updatedJob) {
      return NextResponse.json({ error: "Job was updated but could not be fetched" }, { status: 500 });
    }

    return NextResponse.json({
      job: {
        id: updatedJob.id,
        title: updatedJob.title,
        companyId: updatedJob.company.id,
        company: updatedJob.company.companyProfile?.companyName ?? updatedJob.company.name ?? "Unknown company",
        location: updatedJob.location,
        type: updatedJob.type,
        remote: updatedJob.remote,
        description: updatedJob.description,
        postedAt: updatedJob.postedAt.toISOString(),
        skills: updatedJob.skills.map((jobSkill) => jobSkill.skill.name),
      },
    });
  } catch (error) {
    console.error("Failed to update job", error);
    return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, accountType: true },
  });

  if (!companyUser || companyUser.accountType !== "COMPANY") {
    return NextResponse.json({ error: "Only company accounts can delete jobs" }, { status: 403 });
  }

  const jobId = params?.id;
  if (!jobId) {
    return NextResponse.json({ error: "Job id is required" }, { status: 400 });
  }

  const existingJob = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, companyId: true },
  });

  if (!existingJob) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (existingJob.companyId !== companyUser.id) {
    return NextResponse.json({ error: "You can only delete your own jobs" }, { status: 403 });
  }

  try {
    await prisma.job.delete({
      where: { id: jobId },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete job", error);
    return NextResponse.json({ error: "Failed to delete job" }, { status: 500 });
  }
}
