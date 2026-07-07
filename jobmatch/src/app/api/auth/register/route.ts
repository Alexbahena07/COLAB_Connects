export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

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

    const user = await prisma.user.create({
      data: {
        name: normalizedName,
        email: normalizedEmail,
        password: hashed,
        image: typeof profilePhoto === "string" ? profilePhoto : null,
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

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Failed to register" }, { status: 500 });
  }
}
