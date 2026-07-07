import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { get } from "@vercel/blob";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
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

  const resumeUrl = user?.profile?.resumeUrl;
  const resumeFileName = user?.profile?.resumeFileName;
  if (!resumeUrl || !resumeFileName) {
    return NextResponse.json({ error: "Resume not found" }, { status: 404 });
  }

  let blob;
  try {
    blob = await get(resumeUrl, { access: "private" });
  } catch (error) {
    console.error("Failed to fetch resume from blob storage", error);
    return NextResponse.json({ error: "Resume not found" }, { status: 404 });
  }
  if (!blob?.stream) {
    return NextResponse.json({ error: "Resume not found" }, { status: 404 });
  }

  const fileType = user.profile?.resumeFileType || "application/pdf";
  const fileNameHeader = encodeURIComponent(resumeFileName);

  return new NextResponse(blob.stream, {
    headers: {
      "Content-Type": fileType,
      "Cache-Control": "no-store",
      "Content-Disposition": `inline; filename="${fileNameHeader}"`,
    },
  });
}


