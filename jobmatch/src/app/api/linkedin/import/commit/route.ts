import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { fetchLinkedInPreview } from "@/lib/linkedin";

const CommitSchema = z.object({
  experienceIds: z.array(z.string()).optional(),
  certificationIds: z.array(z.string()).optional(),
});

// simple helper so .filter() narrows away undefined
const isDefined = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined;

// minimal type for the transaction client – we only care about these delegates
type TxClient = {
  experience: typeof prisma.experience;
  certificate: typeof prisma.certificate;
};

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getToken({ req: request });
  const accessToken = (token as { linkedinAccessToken?: string } | null)?.linkedinAccessToken;
  if (!accessToken) {
    return NextResponse.json(
      { error: "LinkedIn account is not connected." },
      { status: 400 }
    );
  }

  const parsed = CommitSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const { experiences, certifications } = await fetchLinkedInPreview(accessToken);

    const experienceMap = new Map(experiences.map((exp) => [exp.id, exp]));
    const certificationMap = new Map(certifications.map((cert) => [cert.id, cert]));

    const selectedExperiences =
      (parsed.data.experienceIds ?? [])
        .map((id) => experienceMap.get(id))
        .filter(isDefined);

    const selectedCertifications =
      (parsed.data.certificationIds ?? [])
        .map((id) => certificationMap.get(id))
        .filter(isDefined);

    if (!selectedExperiences.length && !selectedCertifications.length) {
      return NextResponse.json(
        { error: "Nothing selected to import." },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx: TxClient) => {
      for (const exp of selectedExperiences) {
        await tx.experience.upsert({
          where: {
            userId_externalId: {
              userId: session.user.id,
              externalId: exp.id,
            },
          },
          update: {
            title: exp.title,
            company: exp.company,
            startDate: exp.startDate ? new Date(exp.startDate) : null,
            endDate: exp.endDate ? new Date(exp.endDate) : null,
            location: exp.location,
            employmentType: exp.employmentType,
            description: exp.description,
          },
          create: {
            userId: session.user.id,
            title: exp.title,
            company: exp.company,
            startDate: exp.startDate ? new Date(exp.startDate) : null,
            endDate: exp.endDate ? new Date(exp.endDate) : null,
            location: exp.location,
            employmentType: exp.employmentType,
            description: exp.description,
            externalId: exp.id,
          },
        });
      }

      for (const cert of selectedCertifications) {
        await tx.certificate.upsert({
          where: {
            userId_externalId: {
              userId: session.user.id,
              externalId: cert.id,
            },
          },
          update: {
            name: cert.name,
            issuer: cert.issuer,
            issuedAt: cert.issueDate ? new Date(cert.issueDate) : null,
            expirationDate: cert.expirationDate ? new Date(cert.expirationDate) : null,
            credentialId: cert.credentialId,
            credentialUrl: cert.credentialUrl,
          },
          create: {
            userId: session.user.id,
            name: cert.name,
            issuer: cert.issuer,
            issuedAt: cert.issueDate ? new Date(cert.issueDate) : null,
            expirationDate: cert.expirationDate ? new Date(cert.expirationDate) : null,
            credentialId: cert.credentialId,
            credentialUrl: cert.credentialUrl,
            externalId: cert.id,
          },
        });
      }
    });

    return NextResponse.json({
      ok: true,
      experiences: selectedExperiences.length,
      certifications: selectedCertifications.length,
    });
  } catch (error) {
    console.error("LinkedIn commit error:", error);
    return NextResponse.json(
      { error: "Failed to save LinkedIn data" },
      { status: 502 }
    );
  }
}
