// src/app/api/profile/upsert/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ResumePayload = {
  fileName: string;
  fileType?: string;
  dataUrl: string;
};

type AvatarPayload = {
  dataUrl: string;
};

type DegreePayload = {
  school: string;
  degree: string | null;
  field: string | null;
  startDate: Date | null;
  endDate: Date | null;
};

type CertificatePayload = {
  name: string;
  issuer: string | null;
  issuedAt: Date | null;
  expirationDate: Date | null;
  credentialId: string | null;
  credentialUrl: string | null;
};

type ExperiencePayload = {
  title: string;
  company: string;
  startDate: Date | null;
  endDate: Date | null;
  location: string | null;
  employmentType: string | null;
  description: string | null;
};

type SkillPayload = {
  name: string;
  years: number | null;
};

type ProfilePayload = {
  firstName?: string | null;
  lastName?: string | null;
  headline?: string | null;
  desiredLocation?: string | null;
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

function normalizeAvatarPayload(input: unknown): AvatarPayload | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const dataUrl = typeof raw.dataUrl === "string" ? raw.dataUrl.trim() : "";
  if (!dataUrl) return null;
  const lower = dataUrl.toLowerCase();
  const isImage =
    lower.startsWith("data:image/jpeg") ||
    lower.startsWith("data:image/png") ||
    lower.startsWith("data:image/webp");
  if (!isImage) return null;
  if (dataUrl.length > 3_000_000) return null;
  return { dataUrl };
}

const toDateOrNull = (value: unknown): Date | null => {
  if (typeof value === "string" || typeof value === "number" || value instanceof Date) {
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? null : date;
  }
  return null;
};

const normalizeDegree = (input: unknown): DegreePayload | null => {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const school = typeof raw.school === "string" ? raw.school : "";
  if (!school) return null;
  return {
    school,
    degree: typeof raw.degree === "string" ? raw.degree : null,
    field: typeof raw.field === "string" ? raw.field : null,
    startDate: toDateOrNull(raw.startDate),
    endDate: toDateOrNull(raw.endDate),
  };
};

const normalizeCertificate = (input: unknown): CertificatePayload | null => {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const name = typeof raw.name === "string" ? raw.name : "";
  if (!name) return null;
  return {
    name,
    issuer: typeof raw.issuer === "string" ? raw.issuer : null,
    issuedAt: toDateOrNull(raw.issuedAt),
    expirationDate: toDateOrNull(raw.expirationDate),
    credentialId: typeof raw.credentialId === "string" ? raw.credentialId : null,
    credentialUrl: typeof raw.credentialUrl === "string" ? raw.credentialUrl : null,
  };
};

const normalizeExperience = (input: unknown): ExperiencePayload | null => {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const title = typeof raw.title === "string" ? raw.title : "";
  const company = typeof raw.company === "string" ? raw.company : "";
  if (!title && !company) return null;
  return {
    title,
    company,
    startDate: toDateOrNull(raw.startDate),
    endDate: toDateOrNull(raw.endDate),
    location: typeof raw.location === "string" ? raw.location : null,
    employmentType: typeof raw.employmentType === "string" ? raw.employmentType : null,
    description: typeof raw.description === "string" ? raw.description : null,
  };
};

const normalizeSkill = (input: unknown): SkillPayload | null => {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const name = typeof raw.name === "string" ? raw.name : "";
  if (!name) return null;
  return {
    name,
    years: typeof raw.years === "number" ? raw.years : null,
  };
};

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

  const rawBody = (await req.json().catch(() => null)) as unknown;
  if (!rawBody || typeof rawBody !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const body = rawBody as Record<string, unknown>;

  const {
    degrees = [],
    certificates = [],
    experiences = [],
    skills = [],
    resume,
    avatar,
  } = body;

  // Validate and type profile from body
  const rawProfile = body.profile;
  if (rawProfile !== undefined && typeof rawProfile !== "object") {
    return NextResponse.json({ error: "Invalid profile" }, { status: 400 });
  }

  let profile: ProfilePayload | null = null;

if (rawProfile && typeof rawProfile === "object") {
  const raw = rawProfile as Record<string, unknown>;
  profile = {
    firstName: typeof raw.firstName === "string" ? raw.firstName : null,
    lastName: typeof raw.lastName === "string" ? raw.lastName : null,
    headline: typeof raw.headline === "string" ? raw.headline : null,
    desiredLocation:
      typeof raw.desiredLocation === "string" ? raw.desiredLocation : null,
  };
}


  let resumePayload: ResumePayload | null = null;
  if (resume !== undefined) {
    resumePayload = normalizeResumePayload(resume);
    if (!resumePayload) {
      return NextResponse.json(
        { error: "Invalid resume payload. Upload a PDF smaller than 10MB." },
        { status: 400 }
      );
    }
  }

  let avatarPayload: AvatarPayload | null = null;
  if (avatar !== undefined) {
    avatarPayload = normalizeAvatarPayload(avatar);
    if (!avatarPayload) {
      return NextResponse.json(
        { error: "Invalid profile photo. Upload a JPG, PNG, or WebP under 3MB." },
        { status: 400 }
      );
    }
  }

  const profileWithResume = user.profile as
    | (typeof user.profile & { resumeData?: string | null })
    | null;
  const hasExistingResume = Boolean(profileWithResume?.resumeData);

  if (!resumePayload && !hasExistingResume) {
    return NextResponse.json(
      { error: "Please upload your resume as a PDF to continue." },
      { status: 400 }
    );
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

      if (avatarPayload) {
        await tx.user.update({
          where: { id: user.id },
          data: { image: avatarPayload.dataUrl },
        });
      }

      // Degrees: replace
      await tx.degree.deleteMany({ where: { userId: user.id } });
      const degreePayloads = (Array.isArray(degrees) ? degrees : [])
        .map((degree) => normalizeDegree(degree))
        .filter((degree): degree is DegreePayload => Boolean(degree));
      if (degreePayloads.length) {
        await tx.degree.createMany({
          data: degreePayloads.map((d) => ({
            userId: user.id,
            school: d.school,
            degree: d.degree,
            field: d.field,
            startDate: d.startDate,
            endDate: d.endDate,
          })),
        });
      }

      // Certificates: replace
      await tx.certificate.deleteMany({ where: { userId: user.id } });
      const certificatePayloads = (Array.isArray(certificates) ? certificates : [])
        .map((certificate) => normalizeCertificate(certificate))
        .filter((certificate): certificate is CertificatePayload => Boolean(certificate));
      if (certificatePayloads.length) {
        await tx.certificate.createMany({
          data: certificatePayloads.map((c) => ({
            userId: user.id,
            name: c.name,
            issuer: c.issuer,
            issuedAt: c.issuedAt,
            expirationDate: c.expirationDate,
            credentialId: c.credentialId,
            credentialUrl: c.credentialUrl,
          })),
        });
      }

      // Experiences: replace
      await tx.experience.deleteMany({ where: { userId: user.id } });
      const experiencePayloads = (Array.isArray(experiences) ? experiences : [])
        .map((experience) => normalizeExperience(experience))
        .filter((experience): experience is ExperiencePayload => Boolean(experience));
      if (experiencePayloads.length) {
        await tx.experience.createMany({
          data: experiencePayloads.map((e) => ({
            userId: user.id,
            title: e.title,
            company: e.company,
            startDate: e.startDate,
            endDate: e.endDate,
            location: e.location,
            employmentType: e.employmentType,
            description: e.description,
          })),
        });
      }

      // Skills: replace
      await tx.userSkill.deleteMany({ where: { userId: user.id } });
      const skillPayloads = (Array.isArray(skills) ? skills : [])
        .map((skill) => normalizeSkill(skill))
        .filter((skill): skill is SkillPayload => Boolean(skill));
      for (const s of skillPayloads) {
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
