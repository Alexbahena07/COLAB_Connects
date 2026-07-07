import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { get } from "@vercel/blob";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; applicantId: string }> }
) {
  // ✅ MUST await params first
  const { id: jobId, applicantId } = await context.params;

  // ✅ MUST get session before using it
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, accountType: true },
  });

  if (!companyUser || companyUser.accountType !== "COMPANY") {
    return NextResponse.json({ error: "Only company accounts can view resumes" }, { status: 403 });
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { companyId: true },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.companyId !== companyUser.id) {
    return NextResponse.json({
      error: "You can only view resumes for your applicants",
    }, { status: 403 });
  }

  // Verify the applicant actually applied
  const application = await prisma.jobApplication.findUnique({
    where: { jobId_applicantId: { jobId, applicantId } },
    select: { id: true },
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const applicant = await prisma.user.findUnique({
    where: { id: applicantId },
    select: {
      profile: {
        select: {
          resumeUrl: true,
          resumeFileName: true,
          resumeFileType: true,
        },
      },
    },
  });

  const resumeUrl = applicant?.profile?.resumeUrl;
  const resumeFileName = applicant?.profile?.resumeFileName;

  if (!resumeUrl || !resumeFileName) {
    return NextResponse.json({ error: "Resume not found for this applicant" }, { status: 404 });
  }

  let blob;
  try {
    blob = await get(resumeUrl, { access: "private" });
  } catch (error) {
    console.error("Failed to fetch applicant resume from blob storage", error);
    return NextResponse.json({ error: "Resume not found for this applicant" }, { status: 404 });
  }
  if (!blob?.stream) {
    return NextResponse.json({ error: "Resume not found for this applicant" }, { status: 404 });
  }

  const fileType = applicant?.profile?.resumeFileType || "application/pdf";
  const fileNameHeader = encodeURIComponent(resumeFileName);

  return new NextResponse(blob.stream, {
    headers: {
      "Content-Type": fileType,
      "Cache-Control": "no-store",
      "Content-Disposition": `inline; filename="${fileNameHeader}"`,
    },
  });
}
