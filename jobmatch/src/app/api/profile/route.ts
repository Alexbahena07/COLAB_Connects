import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const defaultPayload = {
  profile: { firstName: "", lastName: "", headline: "", desiredLocation: "" },
  degrees: [] as Array<Record<string, string>>,
  certificates: [] as Array<Record<string, string>>,
  experiences: [] as Array<Record<string, string>>,
  skills: [] as Array<{ name: string; years: number | null }>,
};

const toDateInput = (value: Date | null): string => {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      profile: true,
      degrees: true,
      certificates: true,
      experiences: true,
      userSkills: {
        include: {
          skill: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json(defaultPayload);
  }

  const payload = {
    profile: {
      firstName: user.profile?.firstName ?? "",
      lastName: user.profile?.lastName ?? "",
      headline: user.profile?.headline ?? "",
      desiredLocation: user.profile?.desiredLocation ?? "",
    },
    degrees: user.degrees.map((degree) => ({
      school: degree.school ?? "",
      degree: degree.degree ?? "",
      field: degree.field ?? "",
      startDate: toDateInput(degree.startDate),
      endDate: toDateInput(degree.endDate),
    })),
    certificates: user.certificates.map((certificate) => ({
      name: certificate.name ?? "",
      issuer: certificate.issuer ?? "",
      issuedAt: toDateInput(certificate.issuedAt),
      credentialId: certificate.credentialId ?? "",
      credentialUrl: certificate.credentialUrl ?? "",
    })),
    experiences: user.experiences.map((experience) => ({
      title: experience.title ?? "",
      company: experience.company ?? "",
      startDate: toDateInput(experience.startDate),
      endDate: toDateInput(experience.endDate),
      description: experience.description ?? "",
    })),
    skills: user.userSkills.map((userSkill) => ({
      name: userSkill.skill.name,
      years: userSkill.years ?? null,
    })),
  };

  return NextResponse.json(payload);
}
