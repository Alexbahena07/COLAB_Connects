import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applicantSelect, mapApplicant, type ApplicantWithProfile } from "@/lib/applicantMapper";

type ApplicationWithApplicantAndJob = {
  id: string;
  jobId: string;
  status: string;
  createdAt: Date;
  applicant: ApplicantWithProfile;
};

// Combines what used to be two sequential client requests (job list, then
// applicants for the selected job) into a single round trip. Both queries
// are independent of each other, so they run concurrently server-side.
export async function GET() {
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

  const [jobs, applications] = await Promise.all([
    prisma.job.findMany({
      where: { companyId: companyUser.id },
      orderBy: { postedAt: "desc" },
      select: { id: true, title: true },
    }),
    prisma.jobApplication.findMany({
      where: { job: { companyId: companyUser.id } },
      orderBy: { createdAt: "desc" },
      include: {
        applicant: { select: applicantSelect },
      },
    }) as Promise<ApplicationWithApplicantAndJob[]>,
  ]);

  const applicants = applications.map((application) => ({
    applicationId: application.id,
    jobId: application.jobId,
    status: application.status,
    submittedAt: application.createdAt.toISOString(),
    applicant: mapApplicant(application.applicant, application.jobId),
  }));

  return NextResponse.json({ jobs, applicants });
}
