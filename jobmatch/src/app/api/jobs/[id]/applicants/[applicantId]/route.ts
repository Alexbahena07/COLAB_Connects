import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  status: z.enum(["SUBMITTED", "UNDER_REVIEW", "INTERVIEWING", "OFFERED", "HIRED", "REJECTED"]),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; applicantId: string }> }
) {
  const { id: jobId, applicantId } = await context.params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, accountType: true },
  });

  if (!companyUser || companyUser.accountType !== "COMPANY") {
    return NextResponse.json({ error: "Only company accounts can update applicants" }, { status: 403 });
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, title: true, companyId: true },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.companyId !== companyUser.id) {
    return NextResponse.json(
      { error: "You can only update applicants for your own jobs" },
      { status: 403 }
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const application = await prisma.jobApplication.findUnique({
    where: { jobId_applicantId: { jobId, applicantId } },
    select: { id: true },
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const updated = await prisma.jobApplication.update({
    where: { id: application.id },
    data: { status: parsed.data.status },
  });

  await prisma.notification.create({
    data: {
      userId: applicantId,
      type: "APPLICATION_STATUS_CHANGED",
      jobId: job.id,
      jobTitle: job.title,
      applicationStatus: parsed.data.status,
      companyId: companyUser.id,
    },
  });

  return NextResponse.json({ application: updated });
}
