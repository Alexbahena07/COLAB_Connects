import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type CandidateSkill = { name: string; years: number | null };
type CandidateExperience = {
  id: string;
  title: string | null;
  company: string | null;
  startDate: Date | null;
  endDate: Date | null;
  location: string | null;
  employmentType: string | null;
  description: string | null;
};
type CandidateDegree = {
  id: string;
  school: string | null;
  degree: string | null;
  field: string | null;
  startDate: Date | null;
  endDate: Date | null;
};

type CandidateRow = {
  id: string;
  name: string | null;
  email: string | null;
  profile: {
    firstName: string | null;
    lastName: string | null;
    headline: string | null;
    desiredLocation: string | null;
  } | null;
  degrees: CandidateDegree[];
  experiences: CandidateExperience[];
  userSkills: Array<{ skill: { name: string }; years: number | null }>;
};

const candidateSelect = {
  id: true,
  name: true,
  email: true,
  profile: {
    select: {
      firstName: true,
      lastName: true,
      headline: true,
      desiredLocation: true,
    },
  },
  degrees: true,
  experiences: true,
  userSkills: {
    include: { skill: true },
  },
} as const;

const parseNumberParam = (value: string | null) => {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const degreeLabel = (value: string | null) => (value ?? "").toLowerCase();

const classifyDegree = (degree: string | null) => {
  const text = degreeLabel(degree);
  if (/\b(bachelor|b\.?s\.?|b\.?a\.?|bsc|ba|bs|undergrad)\b/.test(text)) {
    return "undergrad";
  }
  if (/\b(master|m\.?s\.?|m\.?a\.?|mba|phd|doctor|jd|md)\b/.test(text)) {
    return "grad";
  }
  return "unknown";
};

const computeYearsOut = (endDate: Date | null) => {
  if (!endDate) return null;
  const diff = Date.now() - endDate.getTime();
  if (diff <= 0) return 0;
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
};

const latestEndDate = (degrees: CandidateDegree[], level: "undergrad" | "grad") => {
  const matching = degrees.filter(
    (degree) => degree.endDate && classifyDegree(degree.degree) === level
  );
  if (matching.length === 0) return null;
  return matching.reduce((latest, current) =>
    current.endDate && latest && current.endDate > latest ? current.endDate : latest
  , matching[0].endDate ?? null);
};

const withinRange = (value: number | null, min: number | null, max: number | null) => {
  if (min === null && max === null) return true;
  if (value === null) return false;
  if (min !== null && value < min) return false;
  if (max !== null && value > max) return false;
  return true;
};

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, accountType: true },
  });

  if (!companyUser || companyUser.accountType !== "COMPANY") {
    return NextResponse.json(
      { error: "Only company accounts can view candidates" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const location = searchParams.get("location")?.trim() ?? "";
  const skills = (searchParams.get("skills") ?? "")
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);
  const employmentTypes = (searchParams.get("employmentTypes") ?? "")
    .split(",")
    .map((type) => type.trim())
    .filter(Boolean);

  const ugYearsOutMin = parseNumberParam(searchParams.get("ugYearsOutMin"));
  const ugYearsOutMax = parseNumberParam(searchParams.get("ugYearsOutMax"));
  const gradYearsOutMin = parseNumberParam(searchParams.get("gradYearsOutMin"));
  const gradYearsOutMax = parseNumberParam(searchParams.get("gradYearsOutMax"));

  const page = Math.max(parseNumberParam(searchParams.get("page")) ?? 1, 1);
  const pageSize = Math.min(Math.max(parseNumberParam(searchParams.get("pageSize")) ?? 50, 1), 200);
  const skip = (page - 1) * pageSize;

  const where: Prisma.UserWhereInput = {
    accountType: "STUDENT",
  };

  const andFilters: Prisma.UserWhereInput[] = [];

  if (q) {
    andFilters.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { profile: { is: { headline: { contains: q, mode: "insensitive" } } } },
        { profile: { is: { desiredLocation: { contains: q, mode: "insensitive" } } } },
        {
          userSkills: {
            some: { skill: { name: { contains: q, mode: "insensitive" } } },
          },
        },
      ],
    });
  }

  if (location) {
    andFilters.push({
      profile: { is: { desiredLocation: { contains: location, mode: "insensitive" } } },
    });
  }

  if (skills.length > 0) {
    andFilters.push({
      userSkills: {
        some: {
          OR: skills.map((skill) => ({
            skill: { name: { contains: skill, mode: "insensitive" } },
          })),
        },
      },
    });
  }

  if (employmentTypes.length > 0) {
    andFilters.push({
      experiences: {
        some: {
          OR: employmentTypes.map((type) => ({
            employmentType: { contains: type, mode: "insensitive" },
          })),
        },
      },
    });
  }

  if (andFilters.length > 0) {
    where.AND = andFilters;
  }

  const candidates = (await prisma.user.findMany({
    where,
    orderBy: { name: "asc" },
    select: candidateSelect,
  })) as CandidateRow[];

  const savedCandidates = await prisma.savedCandidate.findMany({
    where: { companyId: companyUser.id },
    select: { candidateId: true },
  });
  const savedIds = new Set(savedCandidates.map((saved) => saved.candidateId));

  const mapped = candidates.map((candidate) => {
    const profile = candidate.profile;
    const computedName = `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim();
    const undergradEndDate = latestEndDate(candidate.degrees, "undergrad");
    const gradEndDate = latestEndDate(candidate.degrees, "grad");
    const yearsOutUndergrad = computeYearsOut(undergradEndDate);
    const yearsOutGraduate = computeYearsOut(gradEndDate);

    return {
      id: candidate.id,
      name: candidate.name ?? (computedName || "Unknown candidate"),
      email: candidate.email ?? null,
      headline: profile?.headline ?? null,
      desiredLocation: profile?.desiredLocation ?? null,
      degrees: candidate.degrees.map((degree) => ({
        id: degree.id,
        school: degree.school,
        degree: degree.degree,
        field: degree.field,
        startDate: degree.startDate ? degree.startDate.toISOString() : null,
        endDate: degree.endDate ? degree.endDate.toISOString() : null,
      })),
      experiences: candidate.experiences.map((experience) => ({
        id: experience.id,
        title: experience.title,
        company: experience.company,
        startDate: experience.startDate ? experience.startDate.toISOString() : null,
        endDate: experience.endDate ? experience.endDate.toISOString() : null,
        location: experience.location,
        employmentType: experience.employmentType,
        description: experience.description,
      })),
      skills: candidate.userSkills.map((userSkill) => ({
        name: userSkill.skill.name,
        years: userSkill.years ?? null,
      })) as CandidateSkill[],
      yearsOutUndergrad,
      yearsOutGraduate,
      isSaved: savedIds.has(candidate.id),
    };
  });

  const filtered = mapped.filter((candidate) => {
    const matchesUndergrad = withinRange(
      candidate.yearsOutUndergrad,
      ugYearsOutMin,
      ugYearsOutMax
    );
    const matchesGrad = withinRange(
      candidate.yearsOutGraduate,
      gradYearsOutMin,
      gradYearsOutMax
    );
    return matchesUndergrad && matchesGrad;
  });

  const pageResults = filtered.slice(skip, skip + pageSize);

  return NextResponse.json({
    candidates: pageResults,
    total: filtered.length,
    page,
    pageSize,
  });
}
