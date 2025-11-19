// src/app/api/profile/upsert/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

type ResumePayload = {
  fileName: string;
  fileType?: string;
  dataUrl: string;
};

function normalizeResumePayload(input: unknown): ResumePayload | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const fileName = typeof raw.fileName === "string" ? raw.fileName.trim() : "";
  const fileType =
    typeof raw.fileType === "string" && raw.fileType.trim()
      ? raw.fileType.trim()
      : "application/pdf";
  const dataUrl = typeof raw.dataUrl === "string" ? raw.dataUrl.trim() : "";

  if (!fileName || !dataUrl) return null;
  const isPdfType =
    fileType.toLowerCase().includes("pdf") ||
    fileName.toLowerCase().endsWith(".pdf") ||
    dataUrl.toLowerCase().startsWith("data:application/pdf");
  if (!isPdfType) return null;
  // Rough size guard (~10MB of base64)
  if (dataUrl.length > 15_000_000) return null;

  return { fileName, fileType, dataUrl };
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, profile: { select: { resumeData: true } } },
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
    resume,
  } = body;

  if (profile && typeof profile !== "object") {
    return NextResponse.json({ error: "Invalid profile" }, { status: 400 });
  }

  let resumePayload: ResumePayload | null = null;
  if (resume !== undefined) {
    resumePayload = normalizeResumePayload(resume);
    if (!resumePayload) {
      return NextResponse.json({ error: "Invalid resume payload. Upload a PDF smaller than 10MB." }, { status: 400 });
    }
  }

  const profileWithResume = user.profile as
    | (typeof user.profile & { resumeData?: string | null })
    | null;
  const hasExistingResume = Boolean(profileWithResume?.resumeData);

  if (!resumePayload && !hasExistingResume) {
    return NextResponse.json({ error: "Please upload your resume as a PDF to continue." }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const resumeFields = resumePayload
        ? {
            resumeFileName: resumePayload.fileName,
            resumeFileType: resumePayload.fileType ?? "application/pdf",
            resumeData: resumePayload.dataUrl,
          }
        : {};

      // Profile upsert
      await tx.profile.upsert({
        where: { userId: user.id },
        update: {
          firstName: profile?.firstName ?? null,
          lastName: profile?.lastName ?? null,
          headline: profile?.headline ?? null,
          desiredLocation: profile?.desiredLocation ?? null,
          ...resumeFields,
        },
        create: {
          userId: user.id,
          firstName: profile?.firstName ?? null,
          lastName: profile?.lastName ?? null,
          headline: profile?.headline ?? null,
          desiredLocation: profile?.desiredLocation ?? null,
          resumeFileName: resumePayload?.fileName ?? null,
          resumeFileType: resumePayload?.fileType ?? "application/pdf",
          resumeData: resumePayload?.dataUrl ?? null,
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
