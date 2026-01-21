import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createJobSchema = z.object({
  title: z.string().min(1).max(200),
  location: z.string().min(1).max(200),
  type: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"]),
  remote: z.boolean().optional(),
  description: z.string().min(1),
  skills: z.array(z.string().min(1).max(100)).optional().default([]),
});

const normalizeSkills = (skills: string[]) =>
  Array.from(new Set(skills.map((skill) => skill.trim()).filter((skill) => skill.length > 0)));

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope");

  let companyIdFilter: string | null = null;
  if (scope === "mine") {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    companyIdFilter = session.user.id;
  }

  const jobs = await prisma.job.findMany({
    where: companyIdFilter ? { companyId: companyIdFilter } : undefined,
    orderBy: { postedAt: "desc" },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          image: true,
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

  const payload = jobs.map((job) => ({
    id: job.id,
    title: job.title,
    companyId: job.company.id,
    company: job.company.companyProfile?.companyName ?? job.company.name ?? "Unknown company",
    companyImage: job.company.image ?? null,
    location: job.location,
    type: job.type,
    remote: job.remote,
    description: job.description,
    postedAt: job.postedAt.toISOString(),
    skills: job.skills.map((jobSkill) => jobSkill.skill.name),
  }));

  return NextResponse.json({ jobs: payload });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      accountType: true,
    },
  });

  if (!companyUser || companyUser.accountType !== "COMPANY") {
    return NextResponse.json({ error: "Only company accounts can post jobs" }, { status: 403 });
  }

  const parsedPayload = createJobSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsedPayload.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsedPayload.error.flatten() }, { status: 400 });
  }

  const { title, location, type, remote = false, description, skills = [] } = parsedPayload.data;
  const uniqueSkills = normalizeSkills(skills);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const job = await tx.job.create({
        data: {
          companyId: companyUser.id,
          title,
          location,
          type,
          remote,
          description,
        },
      });

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
              jobId: job.id,
              skillId: skill.id,
            })),
          });
        }
      }

      const followers = await tx.companyFollow.findMany({
        where: { companyId: companyUser.id },
        select: { userId: true },
      });

      if (followers.length > 0) {
        await tx.jobPostEvent.createMany({
          data: followers.map((f) => ({
            userId: f.userId,
            companyId: companyUser.id,
            jobId: job.id,
            jobTitle: job.title,
          })),
        });

        await tx.notification.createMany({
          data: followers.map((f) => ({
            userId: f.userId,
            companyId: companyUser.id,
            jobId: job.id,
            jobTitle: job.title,
            type: "NEW_JOB",
          })),
        });
      }

      return job.id;
    });

    const createdJob = await prisma.job.findUnique({
      where: { id: result },
      include: {
        company: {
          select: {
            name: true,
            image: true,
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

    if (!createdJob) {
      return NextResponse.json({ error: "Job was created but could not be fetched" }, { status: 500 });
    }

    return NextResponse.json(
      {
        job: {
          id: createdJob.id,
          title: createdJob.title,
          companyId: createdJob.companyId,
          company: createdJob.company.companyProfile?.companyName ?? createdJob.company.name ?? "Unknown company",
          companyImage: createdJob.company.image ?? null,
          location: createdJob.location,
          type: createdJob.type,
          remote: createdJob.remote,
          description: createdJob.description,
          postedAt: createdJob.postedAt.toISOString(),
          skills: createdJob.skills.map((jobSkill) => jobSkill.skill.name),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create job", error);
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }
}

