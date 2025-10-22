import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

const ACCOUNT_TYPE_MAP = {
  student: "STUDENT",
  company: "COMPANY",
} as const;

type AccountTypeKey = keyof typeof ACCOUNT_TYPE_MAP;

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const email = typeof payload?.email === "string" ? payload.email.trim().toLowerCase() : "";
    const password = typeof payload?.password === "string" ? payload.password : "";
    const name = typeof payload?.name === "string" ? payload.name.trim() : null;
    const accountTypeInput = (payload?.accountType ?? "student") as AccountTypeKey;
    const accountType =
      accountTypeInput && accountTypeInput in ACCOUNT_TYPE_MAP ? ACCOUNT_TYPE_MAP[accountTypeInput] : "STUDENT";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        email,
        password: hash,
        name,
        accountType,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
