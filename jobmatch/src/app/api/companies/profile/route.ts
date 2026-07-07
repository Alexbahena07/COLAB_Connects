import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CompanyProfileSchema = z.object({
  companyName: z.string().min(1, "Company name is required").max(200),
  website: z
    .string()
    .max(500)
    .refine((v) => v === "" || /^https?:\/\/.+/.test(v), {
      message: "Website must be a valid URL starting with http:// or https://",
    })
    .optional(),
  headquarters: z.string().max(200).optional(),
  teamSize: z.string().max(100).optional(),
  industry: z.string().max(200).optional(),
  bio: z.string().max(5000).optional(),
});

const loadCompanyProfile = async (userId: string) =>
  prisma.companyProfile.findUnique({
    where: { userId },
    select: {
      companyName: true,
      website: true,
      headquarters: true,
      teamSize: true,
      hiringFocus: true,
      about: true,
    },
  });

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { accountType: true },
  });

  if (companyUser?.accountType !== "COMPANY") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const profile = await loadCompanyProfile(session.user.id);

  return NextResponse.json({
    profile: {
      companyName: profile?.companyName ?? "",
      website: profile?.website ?? "",
      headquarters: profile?.headquarters ?? "",
      teamSize: profile?.teamSize ?? "",
      industry: profile?.hiringFocus ?? "",
      bio: profile?.about ?? "",
    },
  });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { accountType: true },
  });

  if (companyUser?.accountType !== "COMPANY") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = CompanyProfileSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "Invalid profile data";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { companyName, website, headquarters, teamSize, industry, bio } = parsed.data;
  const toOptional = (v: string | undefined) => (v?.trim() ? v.trim() : null);
  const hiringFocus = toOptional(industry);
  const about = toOptional(bio);

  const profile = await prisma.companyProfile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      companyName: companyName.trim(),
      website: toOptional(website),
      headquarters: toOptional(headquarters),
      teamSize: toOptional(teamSize),
      hiringFocus,
      about,
    },
    update: {
      companyName: companyName.trim(),
      website: toOptional(website),
      headquarters: toOptional(headquarters),
      teamSize: toOptional(teamSize),
      hiringFocus,
      about,
    },
    select: {
      companyName: true,
      website: true,
      headquarters: true,
      teamSize: true,
      hiringFocus: true,
      about: true,
    },
  });

  return NextResponse.json({
    profile: {
      companyName: profile.companyName ?? "",
      website: profile.website ?? "",
      headquarters: profile.headquarters ?? "",
      teamSize: profile.teamSize ?? "",
      industry: profile.hiringFocus ?? "",
      bio: profile.about ?? "",
    },
  });
}
