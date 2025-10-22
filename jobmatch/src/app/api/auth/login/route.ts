import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // Parse JSON body
  const { email, password } = await req.json().catch(() => ({} as any));

  // 🔐 Temporary hardcoded credentials (replace with real auth later)
  const DEMO_EMAIL = "demo@site.com";
  const DEMO_PASS = "demo1234";

  // Basic checks
  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (email === DEMO_EMAIL && password === DEMO_PASS) {
    // Create a fake session token
    const token = crypto.randomUUID();

    // Set an httpOnly cookie (no JS access) for a week
    const res = NextResponse.json({ ok: true });
    res.cookies.set({
      name: "session",
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return res;
  }

  return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
}
