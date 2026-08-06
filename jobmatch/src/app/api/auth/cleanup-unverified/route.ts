import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteAvatarBlobIfManaged } from "@/lib/avatarBlob";

export const dynamic = "force-dynamic";

const UNVERIFIED_TTL_MS = 24 * 60 * 60 * 1000;

const requireSecret = (request: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Cron secret not configured" }, { status: 500 });
  }
  // Vercel Cron automatically sends `Authorization: Bearer $CRON_SECRET` when
  // invoking this route on schedule. See:
  // https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
};

// Accounts that never verified within 24 hours never got past registration —
// no login, no profile setup, nothing worth keeping — so they're deleted
// outright rather than just marked inactive.
export async function GET(request: Request) {
  const unauthorized = requireSecret(request);
  if (unauthorized) return unauthorized;

  const cutoff = new Date(Date.now() - UNVERIFIED_TTL_MS);

  const staleUsers = await prisma.user.findMany({
    where: { emailVerified: null, createdAt: { lte: cutoff } },
    select: { id: true, image: true },
  });

  let deleted = 0;
  let failed = 0;

  for (const user of staleUsers) {
    try {
      // Registration is the only point an unverified user could have
      // uploaded a photo, so this is the one blob worth cleaning up.
      await deleteAvatarBlobIfManaged(user.image);
      await prisma.user.delete({ where: { id: user.id } });
      deleted += 1;
    } catch (error) {
      failed += 1;
      console.error("Failed to delete unverified user", { userId: user.id, error });
    }
  }

  return NextResponse.json({ checked: staleUsers.length, deleted, failed });
}
