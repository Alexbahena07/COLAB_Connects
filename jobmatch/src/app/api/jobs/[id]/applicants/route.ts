import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Narrow shape for "applicant with profile" based on what we actually use
type ApplicantWithProfile = {
  id: string;
  email: string | null;
  name: string | null;
  profile: {
    firstName: string | null;
    lastName: string | null;
    headline: string | null;
    desiredLocation: string | null;
    resumeFileName: string | null;
    resumeFileType: string | null;
  } | null;
  degrees: Array<{
    id: string;
    school: string | null;
    degree: string | null;
    field: string | null;
    startDate: Date | null;
    endDate: Date | null;
  }>;
  certificates: Array<{
    id: string;
    name: string | null;
    issuer: string | null;
    issuedAt: Date | null;
    expirationDate: Date | null;
    credentialId: string | null;
    credentialUrl: string | null;
  }>;
  experiences: Array<{
    id: string;
    title: string | null;
    company: string | null;
    startDate: Date | null;
    endDate: Date | null;
    location: string | null;
    employmentType: string | null;
    description: string | null;
  }>;
  userSkills: Array<{
    skill: { name: string };
    years: number | null;
  }>;
};

const applicantSelect = {
  id: true,
  email: true,
  name: true,
  profile: {
    select: {
      firstName: true,
      lastName: true,
      headline: true,
      desiredLocation: true,
      resumeFileName: true,
      resumeFileType: true,
    },
  },
  degrees: true,
  certificates: true,
  experiences: true,
  userSkills: {
    include: { skill: true },
  },
} as const;

const mapApplicant = (applicant: ApplicantWithProfile, jobId: string) => {
  const profile = applicant.profile;
  const computedName = `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim();

  return {
    id: applicant.id,
    email: applicant.email ?? null,
    name: applicant.name ?? (computedName || "Unknown applicant"),
    headline: profile?.headline ?? null,
    desiredLocation: profile?.desiredLocation ?? null,
    resumeFileName: profile?.resumeFileName ?? null,
    resumeFileType: profile?.resumeFileType ?? null,
    resumeUrl: profile?.resumeFileName
      ? `/api/jobs/${jobId}/applicants/${applicant.id}/resume`
      : null,
    degrees: applicant.degrees.map((degree) => ({
      id: degree.id,
      school: degree.school,
      degree: degree.degree,
      field: degree.field,
      startDate: degree.startDate ? degree.startDate.toISOString() : null,
      endDate: degree.endDate ? degree.endDate.toISOString() : null,
    })),
    certificates: applicant.certificates.map((certificate) => ({
      id: certificate.id,
      name: certificate.name,
      issuer: certificate.issuer,
      issuedAt: certificate.issuedAt ? certificate.issuedAt.toISOString() : null,
      expirationDate: certificate.expirationDate
        ? certificate.expirationDate.toISOString()
        : null,
      credentialId: certificate.credentialId,
      credentialUrl: certificate.credentialUrl,
    })),
    experiences: applicant.experiences.map((experience) => ({
      id: experience.id,
      title: experience.title,
      company: experience.company,
      startDate: experience.startDate ? experience.startDate.toISOString() : null,
      endDate: experience.endDate ? experience.endDate.toISOString() : null,
      location: experience.location,
      employmentType: experience.employmentType,
      description: experience.description,
    })),
    skills: applicant.userSkills.map((userSkill) => ({
      name: userSkill.skill.name,
      years: userSkill.years ?? null,
    })),
  };
};

// Shape of a jobApplication row including the joined applicant
type ApplicationWithApplicant = {
  id: string;
  jobId: string;
  applicantId: string;
  status: string;
  createdAt: Date;
  applicant: ApplicantWithProfile;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  // ✅ New Next.js 15+ dynamic API pattern: params is a Promise
  const { id: jobId } = await context.params;

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
      { error: "Only company accounts can view applicants" },
      { status: 403 }
    );
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          companyProfile: {
            select: { companyName: true },
          },
        },
      },
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.companyId !== companyUser.id) {
    return NextResponse.json(
      { error: "You can only view applicants for your own jobs" },
      { status: 403 }
    );
  }

  const applications = (await prisma.jobApplication.findMany({
    where: { jobId },
    orderBy: { createdAt: "desc" },
    include: {
      applicant: { select: applicantSelect },
    },
  })) as ApplicationWithApplicant[];

  const applicants = applications.map((application) => ({
    applicationId: application.id,
    jobId,
    status: application.status,
    submittedAt: application.createdAt.toISOString(),
    applicant: mapApplicant(application.applicant, jobId),
  }));

  return NextResponse.json({
    job: {
      id: job.id,
      title: job.title,
      companyId: job.companyId,
      companyName:
        job.company.companyProfile?.companyName ??
        job.company.name ??
        "Unknown company",
      location: job.location,
      type: job.type,
      remote: job.remote,
      postedAt: job.postedAt.toISOString(),
    },
    applicants,
  });
}
