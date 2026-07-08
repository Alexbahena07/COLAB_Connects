import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const companyId = searchParams.get("companyId");

  const where: Prisma.JobWhereInput = {};
  if (status === "APPROVED" || status === "REJECTED") {
    where.status = status;
  }
  if (companyId) {
    where.companyId = companyId;
  }

  const jobs = await prisma.job.findMany({
    where,
    orderBy: { postedAt: "desc" },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          companyProfile: { select: { companyName: true } },
        },
      },
      reviewedBy: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({
    jobs: jobs.map((job) => ({
      id: job.id,
      title: job.title,
      location: job.location,
      type: job.type,
      remote: job.remote,
      postedAt: job.postedAt.toISOString(),
      status: job.status,
      reviewedAt: job.reviewedAt?.toISOString() ?? null,
      reviewedByName: job.reviewedBy?.name ?? job.reviewedBy?.email ?? null,
      companyId: job.company.id,
      companyName: job.company.companyProfile?.companyName ?? job.company.name ?? "Unknown company",
    })),
  });
}
