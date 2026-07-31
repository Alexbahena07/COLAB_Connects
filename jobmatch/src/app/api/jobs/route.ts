import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRankedJobIdsForFeed } from "@/lib/jobRanking";

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

const parseNumberParam = (value: string | null) => {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const jobInclude = {
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
} satisfies Prisma.JobInclude;

type JobWithRelations = Prisma.JobGetPayload<{ include: typeof jobInclude }>;

const toJobPayload = (job: JobWithRelations) => ({
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
  status: job.status,
  skills: job.skills.map((jobSkill) => jobSkill.skill.name),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope");

  const session = await getServerSession(authOptions);

  if (scope === "mine") {
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jobs = await prisma.job.findMany({
      where: { companyId: session.user.id },
      orderBy: { postedAt: "desc" },
      include: jobInclude,
    });

    return NextResponse.json({ jobs: jobs.map((job) => toJobPayload(job)) });
  }

  // Public/student feed: a small featured strip from GOLD/PLATINUM sponsors,
  // then the rest ordered by relevance (skill/location match for the signed-in
  // student, blended with recency and a smaller across-the-board tier boost)
  // — all computed and sorted in Postgres, not fetched-then-sorted in memory,
  // so it stays fast regardless of how many jobs are posted. Only rejected
  // jobs are excluded; an admin hasn't blocked anything else from the feed.
  const page = parseNumberParam(searchParams.get("page"));
  const pageSize = parseNumberParam(searchParams.get("pageSize"));
  const pagination =
    page !== null || pageSize !== null
      ? {
          skip: (Math.max(page ?? 1, 1) - 1) * Math.min(Math.max(pageSize ?? 50, 1), 200),
          take: Math.min(Math.max(pageSize ?? 50, 1), 200),
        }
      : null;

  const { orderedIds, featuredIds } = await getRankedJobIdsForFeed(session?.user?.id, pagination);

  if (orderedIds.length === 0) {
    return NextResponse.json({ jobs: [] });
  }

  const jobs = await prisma.job.findMany({
    where: { id: { in: orderedIds } },
    include: jobInclude,
  });

  const jobsById = new Map(jobs.map((job) => [job.id, job]));
  const payload = orderedIds
    .map((id) => jobsById.get(id))
    .filter((job): job is NonNullable<typeof job> => Boolean(job))
    .map((job) => ({ ...toJobPayload(job), sponsored: featuredIds.has(job.id) }));

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
      status: true,
      companyProfile: { select: { approvalStatus: true } },
    },
  });

  if (!companyUser || companyUser.status !== "ACTIVE") {
    return NextResponse.json({ error: "Your account is not active" }, { status: 403 });
  }

  if (companyUser.accountType !== "COMPANY") {
    return NextResponse.json({ error: "Only company accounts can post jobs" }, { status: 403 });
  }

  if (companyUser.companyProfile?.approvalStatus !== "APPROVED") {
    return NextResponse.json(
      { error: "Your company account is pending admin approval before you can post jobs" },
      { status: 403 }
    );
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

