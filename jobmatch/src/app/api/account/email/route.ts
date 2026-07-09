import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import bcrypt from "bcrypt";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const EmailSchema = z.object({
  newEmail: z.string().email("Enter a valid email address").max(255),
  currentPassword: z.string().optional(),
});

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = EmailSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const normalizedEmail = parsed.data.newEmail.trim().toLowerCase();
  const { currentPassword } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, password: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  if (user.email?.toLowerCase() === normalizedEmail) {
    return NextResponse.json({ error: "That's already your email address" }, { status: 400 });
  }

  if (user.password) {
    if (!currentPassword) {
      return NextResponse.json({ error: "Current password is required" }, { status: 400 });
    }
    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }
  }

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: "That email is already in use" }, { status: 409 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { email: normalizedEmail, emailVerified: null },
  });

  return NextResponse.json({ success: true });
}
