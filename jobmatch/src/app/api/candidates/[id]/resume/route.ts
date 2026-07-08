import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { get } from "@vercel/blob";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: candidateId } = await context.params;

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

  const candidate = await prisma.user.findUnique({
    where: { id: candidateId },
    select: {
      accountType: true,
      profile: {
        select: {
          resumeUrl: true,
          resumeFileName: true,
          resumeFileType: true,
        },
      },
    },
  });

  if (!candidate || candidate.accountType !== "STUDENT") {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  const resumeUrl = candidate.profile?.resumeUrl;
  const resumeFileName = candidate.profile?.resumeFileName;

  if (!resumeUrl || !resumeFileName) {
    return NextResponse.json({ error: "Resume not found for this candidate" }, { status: 404 });
  }

  let blob;
  try {
    blob = await get(resumeUrl, { access: "private" });
  } catch (error) {
    console.error("Failed to fetch candidate resume from blob storage", error);
    return NextResponse.json({ error: "Resume not found for this candidate" }, { status: 404 });
  }
  if (!blob?.stream) {
    return NextResponse.json({ error: "Resume not found for this candidate" }, { status: 404 });
  }

  const fileType = candidate.profile?.resumeFileType || "application/pdf";
  const fileNameHeader = encodeURIComponent(resumeFileName);

  return new NextResponse(blob.stream, {
    headers: {
      "Content-Type": fileType,
      "Cache-Control": "no-store",
      "Content-Disposition": `inline; filename="${fileNameHeader}"`,
    },
  });
}
