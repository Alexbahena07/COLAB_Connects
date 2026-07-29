import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireActiveStatus } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import {
  ALLOWED_AVATAR_TYPES,
  MAX_AVATAR_BYTES,
  deleteAvatarBlobIfManaged,
  isAllowedAvatarType,
  uploadAvatarBlob,
} from "@/lib/avatarBlob";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const statusError = await requireActiveStatus(session.user.id);
  if (statusError) return statusError;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file || !isAllowedAvatarType(file.type)) {
    return NextResponse.json(
      { error: `Upload a ${ALLOWED_AVATAR_TYPES.join(", ")} image` },
      { status: 400 }
    );
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return NextResponse.json({ error: "Max 5MB" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { image: true },
  });

  const url = await uploadAvatarBlob(session.user.id, file, file.type);
  await deleteAvatarBlobIfManaged(existing?.image);

  return NextResponse.json({ url });
}
