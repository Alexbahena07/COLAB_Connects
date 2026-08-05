export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { issueVerificationEmail } from "@/lib/emailVerification";
import { MAX_AVATAR_BYTES, isAllowedAvatarType, uploadAvatarBlob } from "@/lib/avatarBlob";
import { isRateLimited, requestIp } from "@/lib/rateLimit";

// profilePhoto arrives as a data URL, e.g. "data:image/jpeg;base64,/9j/4AAQ..."
function parseImageDataUrl(dataUrl: string): { buffer: Buffer; contentType: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const [, contentType, base64] = match;
  if (!isAllowedAvatarType(contentType)) return null;
  const buffer = Buffer.from(base64, "base64");
  if (buffer.length === 0 || buffer.length > MAX_AVATAR_BYTES) return null;
  return { buffer, contentType };
}

const RegisterSchema = z
  .object({
    accountType: z.enum(["STUDENT", "COMPANY"]),
    email: z.string().email("Enter a valid email address").max(255),
    password: z.string().min(8, "Password must be at least 8 characters").max(100),
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    name: z.string().max(200).optional(),
    profilePhoto: z.string().max(2_000_000).optional(),
  })
  .refine(
    (data) =>
      data.accountType === "COMPANY"
        ? Boolean(data.name?.trim())
        : Boolean(data.firstName?.trim()) && Boolean(data.lastName?.trim()),
    { message: "Missing required name fields" }
  );

export async function POST(req: Request) {
  try {
    const ip = requestIp(req);
    if (isRateLimited(`register:ip:${ip}`, 5)) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429 }
      );
    }

    const parsed = RegisterSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? "Invalid registration data";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { accountType, email, password, firstName, lastName, name, profilePhoto } = parsed.data;

    const normalizedType = accountType === "COMPANY" ? "COMPANY" : "STUDENT";
    const isCompany = normalizedType === "COMPANY";
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedFirstName = firstName?.trim() ?? "";
    const normalizedLastName = lastName?.trim() ?? "";
    const normalizedCompanyName = name?.trim() ?? "";
    const normalizedName = isCompany
      ? normalizedCompanyName
      : `${normalizedFirstName} ${normalizedLastName}`.trim();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(String(password), 10);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: normalizedName,
          email: normalizedEmail,
          password: hashed,
          accountType: normalizedType,
          ...(isCompany
            ? {}
            : {
                profile: {
                  create: {
                    firstName: normalizedFirstName,
                    lastName: normalizedLastName,
                  },
                },
              }),
        },
        select: { id: true, email: true },
      });

      // Lifetime counter — never decremented, so it survives account
      // deletions and stays meaningful as a "total signups" metric.
      await tx.appStats.upsert({
        where: { id: "singleton" },
        create: { id: "singleton", totalUsersCreated: 1 },
        update: { totalUsersCreated: { increment: 1 } },
      });

      return created;
    });

    // Store the photo in blob storage rather than as base64 in Postgres. A
    // failed upload shouldn't block account creation — the user can add a
    // photo from their profile afterward.
    if (typeof profilePhoto === "string") {
      const parsed = parseImageDataUrl(profilePhoto);
      if (parsed) {
        try {
          const url = await uploadAvatarBlob(user.id, parsed.buffer, parsed.contentType);
          await prisma.user.update({ where: { id: user.id }, data: { image: url } });
        } catch (err) {
          console.error("Failed to upload profile photo:", err);
        }
      }
    }

    try {
      await issueVerificationEmail(normalizedEmail);
    } catch (err) {
      // Don't fail the registration — the user can request a new link from
      // the login screen via /api/auth/resend-verification.
      console.error("Failed to send verification email:", err);
    }

    return NextResponse.json({ user, requiresVerification: true }, { status: 201 });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Failed to register" }, { status: 500 });
  }
}
