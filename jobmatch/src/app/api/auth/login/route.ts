import { NextResponse } from "next/server";

type LoginPayload = {
  email?: string;
  password?: string;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as unknown;
  const email = typeof (body as LoginPayload | null)?.email === "string" ? (body as LoginPayload).email : undefined;
  const password =
    typeof (body as LoginPayload | null)?.password === "string" ? (body as LoginPayload).password : undefined;

  // 🔐 Temporary hardcoded credentials
  const DEMO_EMAIL = "demo@site.com";
  const DEMO_PASS = "demo1234";

  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (email === DEMO_EMAIL && password === DEMO_PASS) {
    const token = crypto.randomUUID();

    const res = NextResponse.json({ ok: true });
    res.cookies.set({
      name: "session",
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  }

  return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
}
