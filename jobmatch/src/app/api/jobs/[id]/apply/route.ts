// src/app/api/jobs/[id]/apply/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const messagingApiUrl = process.env.MESSAGING_API_URL;

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

const formatApplicant = (applicant: any) => {
  const profile = applicant.profile ?? {};
  const computedName = `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim();

  return {
    id: applicant.id,
    email: applicant.email ?? null,
    name: applicant.name ?? (computedName || "Unknown applicant"),
    profile: {
      firstName: profile.firstName ?? null,
      lastName: profile.lastName ?? null,
      headline: profile.headline ?? null,
      desiredLocation: profile.desiredLocation ?? null,
      resumeFileName: profile.resumeFileName ?? null,
      resumeFileType: profile.resumeFileType ?? null,
    },
    degrees: applicant.degrees,
    certificates: applicant.certificates,
    experiences: applicant.experiences,
    skills: (applicant.userSkills ?? []).map((userSkill: any) => ({
      name: userSkill.skill?.name,
      years: userSkill.years ?? null,
    })),
  };
};

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }   // ⬅️ key change
) {
  const { id: jobId } = await context.params;     // ⬅️ and this

  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!jobId) {
    return NextResponse.json({ error: "Job id is required" }, { status: 400 });
  }

  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        company: {
          select: {
            id: true,
            email: true,
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

    const applicant = await prisma.user.findUnique({
      where: { id: user.id },
      select: applicantSelect,
    });

    if (!applicant) {
      return NextResponse.json({ error: "Applicant profile not found" }, { status: 404 });
    }

    const existingApplication = await prisma.jobApplication.findUnique({
      where: { jobId_applicantId: { jobId, applicantId: user.id } },
      select: { id: true, status: true, createdAt: true },
    });

    const isNewApplication = !existingApplication;
    const application =
      existingApplication ??
      (await prisma.jobApplication.create({
        data: {
          jobId,
          applicantId: user.id,
          companyId: job.companyId,
        },
        select: { id: true, status: true, createdAt: true },
      }));

    const applicantPayload = formatApplicant(applicant);
    const applicationPayload = {
      type: "JOB_APPLICATION",
      application: {
        id: application.id,
        status: application.status,
        submittedAt: application.createdAt.toISOString(),
      },
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
      },
      applicant: applicantPayload,
    };

    if (messagingApiUrl && isNewApplication) {
      const response = await fetch(messagingApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(applicationPayload),
      });

      const responsePayload = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage =
          typeof responsePayload?.error === "string"
            ? responsePayload.error
            : `Messaging API returned ${response.status}`;
        return NextResponse.json(
          { error: errorMessage, application, forwarded: false },
          { status: response.status }
        );
      }

      const successMessage =
        typeof responsePayload?.message === "string"
          ? responsePayload.message
          : "Your application was sent to the company.";

      return NextResponse.json({
        message: successMessage,
        application,
        metadata: responsePayload,
      });
    }

    if (messagingApiUrl && !isNewApplication) {
      return NextResponse.json({
        message: "You already applied to this job. We kept your original submission.",
        application,
        metadata: { forwarded: false, duplicate: true },
      });
    }

    if (!messagingApiUrl && isNewApplication) {
      console.warn(
        "[apply] MESSAGING_API_URL not configured. Application logged locally only.",
        JSON.stringify(applicationPayload, null, 2)
      );
    }

    return NextResponse.json({
      message: existingApplication
        ? "You already applied to this job. We kept your original submission."
        : "Application received. Messaging service is not configured, but your application was recorded.",
      application,
      metadata: { forwarded: false },
    });
  } catch (error) {
    console.error("Failed to submit application", error);
    return NextResponse.json({ error: "Failed to send application" }, { status: 500 });
  }
}
