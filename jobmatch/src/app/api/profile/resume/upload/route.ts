import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { requireActiveStatus } from "@/lib/auth-guards";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const statusError = await requireActiveStatus(session.user.id);
  if (statusError) return statusError;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file || file.type !== "application/pdf")
    return NextResponse.json({ error: "PDF required" }, { status: 400 });
  if (file.size > 5 * 1024 * 1024)
    return NextResponse.json({ error: "Max 5MB" }, { status: 400 });

  const blob = await put(`resumes/${session.user.id}.pdf`, file, {
    access: "private",
    contentType: "application/pdf",
    allowOverwrite: true,
  });

  return NextResponse.json({ url: blob.url, fileName: file.name });
}
