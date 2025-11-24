import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Buffer } from "node:buffer";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const extractBase64 = (dataUrl: string) => {
  const commaIndex = dataUrl.indexOf(",");
  return commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
};

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
          resumeData: true,
          resumeFileName: true,
          resumeFileType: true,
        },
      },
    },
  });

  const resumeData = applicant?.profile?.resumeData;
  const resumeFileName = applicant?.profile?.resumeFileName;

  if (!resumeData || !resumeFileName) {
    return NextResponse.json({ error: "Resume not found for this applicant" }, { status: 404 });
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(extractBase64(resumeData), "base64");
  } catch (error) {
    console.error("Failed to decode applicant resume", error);
    return NextResponse.json({ error: "Invalid resume data" }, { status: 500 });
  }

  const fileType = applicant?.profile?.resumeFileType || "application/pdf";
  const fileNameHeader = encodeURIComponent(resumeFileName);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": fileType,
      "Content-Length": buffer.length.toString(),
      "Cache-Control": "no-store",
      "Content-Disposition": `inline; filename="${fileNameHeader}"`,
    },
  });
}
