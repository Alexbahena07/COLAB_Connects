import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { authOptions } from "@/lib/auth";
import { fetchLinkedInPreview } from "@/lib/linkedin";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getToken({ req: request });
  const accessToken = token?.linkedinAccessToken;
  if (!accessToken) {
    return NextResponse.json({ error: "LinkedIn account is not connected." }, { status: 400 });
  }

  try {
    const payload = await fetchLinkedInPreview(accessToken);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("LinkedIn preview error:", error);
    return NextResponse.json({ error: "Failed to load LinkedIn data" }, { status: 502 });
  }
}

