// src/app/api/profile/upsert/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const {
    profile,
    degrees = [],
    certificates = [],
    experiences = [],
    skills = [], // [{ name, years? }]
  } = body;

  if (profile && typeof profile !== "object") {
    return NextResponse.json({ error: "Invalid profile" }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Profile upsert
      await tx.profile.upsert({
        where: { userId: user.id },
        update: {
          firstName: profile?.firstName ?? null,
          lastName: profile?.lastName ?? null,
          headline: profile?.headline ?? null,
          desiredLocation: profile?.desiredLocation ?? null,
        },
        create: {
          userId: user.id,
          firstName: profile?.firstName ?? null,
          lastName: profile?.lastName ?? null,
          headline: profile?.headline ?? null,
          desiredLocation: profile?.desiredLocation ?? null,
        },
      });

      // Degrees: replace
      await tx.degree.deleteMany({ where: { userId: user.id } });
      if (Array.isArray(degrees) && degrees.length) {
        await tx.degree.createMany({
          data: degrees.map((d: any) => ({
            userId: user.id,
            school: d.school || "",
            degree: d.degree ?? null,
            field: d.field ?? null,
            startDate: d.startDate ? new Date(d.startDate) : null,
            endDate: d.endDate ? new Date(d.endDate) : null,
          })),
        });
      }

      // Certificates: replace
      await tx.certificate.deleteMany({ where: { userId: user.id } });
      if (Array.isArray(certificates) && certificates.length) {
        await tx.certificate.createMany({
          data: certificates.map((c: any) => ({
            userId: user.id,
            name: c.name || "",
            issuer: c.issuer ?? null,
            issuedAt: c.issuedAt ? new Date(c.issuedAt) : null,
            credentialId: c.credentialId ?? null,
            credentialUrl: c.credentialUrl ?? null,
          })),
        });
      }

      // Experiences: replace
      await tx.experience.deleteMany({ where: { userId: user.id } });
      if (Array.isArray(experiences) && experiences.length) {
        await tx.experience.createMany({
          data: experiences.map((e: any) => ({
            userId: user.id,
            title: e.title || "",
            company: e.company || "",
            startDate: e.startDate ? new Date(e.startDate) : null,
            endDate: e.endDate ? new Date(e.endDate) : null,
            description: e.description ?? null,
          })),
        });
      }

      // Skills: replace (no level)
      await tx.userSkill.deleteMany({ where: { userId: user.id } });
      for (const s of Array.isArray(skills) ? skills : []) {
        if (!s?.name) continue;
        const skill = await tx.skill.upsert({
          where: { name: s.name },
          create: { name: s.name },
          update: {},
        });
        await tx.userSkill.create({
          data: {
            userId: user.id,
            skillId: skill.id,
            years: typeof s.years === "number" ? s.years : null,
          },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
}
