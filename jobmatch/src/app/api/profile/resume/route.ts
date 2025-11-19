import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Buffer } from "node:buffer";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

function extractBase64(dataUrl: string): string {
  const commaIndex = dataUrl.indexOf(",");
  return commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
}

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
          resumeData: true,
          resumeFileName: true,
          resumeFileType: true,
        },
      },
    },
  });

  const resumeData = user?.profile?.resumeData;
  const resumeFileName = user?.profile?.resumeFileName;
  if (!resumeData || !resumeFileName) {
    return NextResponse.json({ error: "Resume not found" }, { status: 404 });
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(extractBase64(resumeData), "base64");
  } catch (error) {
    console.error("Failed to decode resume", error);
    return NextResponse.json({ error: "Invalid resume data" }, { status: 500 });
  }

  const fileType = user.profile?.resumeFileType || "application/pdf";
  const fileNameHeader = encodeURIComponent(resumeFileName);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": fileType,
      "Content-Length": buffer.length.toString(),
      "Cache-Control": "no-store",
      "Content-Disposition": `inline; filename="${fileNameHeader}"`,
    },
  });
}

