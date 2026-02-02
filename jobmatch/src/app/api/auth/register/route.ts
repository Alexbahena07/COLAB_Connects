export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  try {
    const { accountType, name, firstName, lastName, email, password, profilePhoto } = await req.json();

    if (!email || !password || !accountType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const normalizedType = String(accountType).toLowerCase() === "company" ? "COMPANY" : "STUDENT";
    const isCompany = normalizedType === "COMPANY";
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedFirstName = typeof firstName === "string" ? firstName.trim() : "";
    const normalizedLastName = typeof lastName === "string" ? lastName.trim() : "";
    const normalizedCompanyName = typeof name === "string" ? name.trim() : "";
    const normalizedName = isCompany
      ? normalizedCompanyName
      : `${normalizedFirstName} ${normalizedLastName}`.trim();

    if (!normalizedEmail) {
      return NextResponse.json({ error: "Invalid name or email" }, { status: 400 });
    }
    if (isCompany) {
      if (!normalizedCompanyName) {
        return NextResponse.json({ error: "Missing company name" }, { status: 400 });
      }
    } else if (!normalizedFirstName || !normalizedLastName) {
      return NextResponse.json({ error: "Missing first or last name" }, { status: 400 });
    }

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
