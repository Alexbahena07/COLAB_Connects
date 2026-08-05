import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import bcrypt from "bcrypt";
import { del } from "@vercel/blob";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteAvatarBlobIfManaged } from "@/lib/avatarBlob";
import { isRateLimited } from "@/lib/rateLimit";
import { ACCOUNT_DELETION_REASONS } from "@/lib/accountDeletion";

const DeleteAccountSchema = z
  .object({
    password: z.string().optional(),
    confirmation: z.string().refine((value) => value === "DELETE", {
      message: 'Type "DELETE" to confirm.',
    }),
    reason: z.enum(ACCOUNT_DELETION_REASONS, {
      errorMap: () => ({ message: "Please select a reason for leaving." }),
    }),
    otherReason: z.string().trim().max(500).optional(),
  })
  .refine((data) => data.reason !== "OTHER" || Boolean(data.otherReason?.trim()), {
    message: "Please tell us a bit more.",
    path: ["otherReason"],
  });

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = DeleteAccountSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  if (isRateLimited(`account-delete:${session.user.id}`, 5)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      password: true,
      image: true,
      accountType: true,
      profile: { select: { resumeUrl: true } },
    },
  });
  if (!user) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  if (user.password) {
    if (!parsed.data.password) {
      return NextResponse.json({ error: "Current password is required" }, { status: 400 });
    }
    const matches = await bcrypt.compare(parsed.data.password, user.password);
    if (!matches) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }
  }

  // Best-effort cleanup of out-of-band Blob storage — neither file lives in
  // Postgres, so the cascading `user.delete` below can't reach them. Failures
  // here shouldn't block account deletion.
  await deleteAvatarBlobIfManaged(user.image);
  if (user.profile?.resumeUrl) {
    try {
      await del(user.profile.resumeUrl);
    } catch (error) {
      console.error("Failed to delete resume blob", error);
    }
  }

  // Every other relation (profile, applications, jobs, notifications, etc.)
  // cascades from User at the DB level — see prisma/schema.prisma. The
  // feedback row has no FK to User so it survives the delete below, giving
  // admins a durable record of why + how many people have left.
  await prisma.$transaction([
    prisma.accountDeletionFeedback.create({
      data: {
        reason: parsed.data.reason,
        otherReason: parsed.data.reason === "OTHER" ? parsed.data.otherReason?.trim() : null,
        accountType: user.accountType,
      },
    }),
    prisma.user.delete({ where: { id: user.id } }),
  ]);

  return NextResponse.json({ success: true });
}
