import crypto from "crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function generateTempPassword(length = 14) {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const tempPassword = generateTempPassword();
  const hashed = await bcrypt.hash(tempPassword, 10);

  await prisma.user.update({
    where: { id },
    data: { password: hashed },
  });

  return NextResponse.json({ tempPassword });
}
