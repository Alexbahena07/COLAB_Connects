import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applicantSelect, mapApplicant, type ApplicantWithProfile } from "@/lib/applicantMapper";

// Shape of a jobApplication row including the joined applicant
type ApplicationWithApplicant = {
  id: string;
  jobId: string;
  applicantId: string;
  status: string;
  createdAt: Date;
  applicant: ApplicantWithProfile;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  // ✅ New Next.js 15+ dynamic API pattern: params is a Promise
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
      { error: "Only company accounts can view applicants" },
      { status: 403 }
    );
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          companyProfile: {
            select: { companyName: true },
          },
        },
      },
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.companyId !== companyUser.id) {
    return NextResponse.json(
      { error: "You can only view applicants for your own jobs" },
      { status: 403 }
    );
  }

  const applications = (await prisma.jobApplication.findMany({
    where: { jobId },
    orderBy: { createdAt: "desc" },
    include: {
      applicant: { select: applicantSelect },
    },
  })) as ApplicationWithApplicant[];

  const applicants = applications.map((application) => ({
    applicationId: application.id,
    jobId,
    status: application.status,
    submittedAt: application.createdAt.toISOString(),
    applicant: mapApplicant(application.applicant, jobId),
  }));

  return NextResponse.json({
    job: {
      id: job.id,
      title: job.title,
      companyId: job.companyId,
      companyName:
        job.company.companyProfile?.companyName ??
        job.company.name ??
        "Unknown company",
      location: job.location,
      type: job.type,
      remote: job.remote,
      postedAt: job.postedAt.toISOString(),
    },
    applicants,
  });
}
