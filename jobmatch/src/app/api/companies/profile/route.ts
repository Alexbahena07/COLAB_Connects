import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ProfilePayload = {
  companyName?: unknown;
  website?: unknown;
  headquarters?: unknown;
  teamSize?: unknown;
  industry?: unknown;
  bio?: unknown;
};

const normalizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizeOptional = (value: unknown) => {
  const trimmed = normalizeText(value);
  return trimmed.length > 0 ? trimmed : null;
};

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

  const body = (await request.json().catch(() => null)) as ProfilePayload | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const companyName = normalizeText(body.companyName);
  if (!companyName) {
    return NextResponse.json({ error: "Company name is required." }, { status: 400 });
  }

  const website = normalizeOptional(body.website);
  const headquarters = normalizeOptional(body.headquarters);
  const teamSize = normalizeOptional(body.teamSize);
  const hiringFocus = normalizeOptional(body.industry);
  const about = normalizeOptional(body.bio);

  const profile = await prisma.companyProfile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      companyName,
      website,
      headquarters,
      teamSize,
      hiringFocus,
      about,
    },
    update: {
      companyName,
      website,
      headquarters,
      teamSize,
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
