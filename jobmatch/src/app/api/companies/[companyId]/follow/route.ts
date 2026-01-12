import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: Promise<{
    companyId: string;
  }>;
};

const ensureCompany = async (companyId: string) =>
  prisma.user.findUnique({
    where: { id: companyId },
    select: { id: true, accountType: true },
  });

export async function GET(_request: Request, { params }: RouteParams) {
  const { companyId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const follow = await prisma.companyFollow.findUnique({
    where: { userId_companyId: { userId: session.user.id, companyId } },
    select: { id: true },
  });

  return NextResponse.json({ isFollowing: Boolean(follow) });
}

export async function POST(_request: Request, { params }: RouteParams) {
  const { companyId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, accountType: true },
  });

  if (!user || user.accountType !== "STUDENT") {
    return NextResponse.json({ error: "Only students can follow companies" }, { status: 403 });
  }

  const company = await ensureCompany(companyId);
  if (!company || company.accountType !== "COMPANY") {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const follow = await prisma.companyFollow.upsert({
    where: { userId_companyId: { userId: user.id, companyId } },
    update: {},
    create: { userId: user.id, companyId },
    select: { createdAt: true },
  });

  return NextResponse.json({ followed: true, createdAt: follow.createdAt.toISOString() });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { companyId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.companyFollow.deleteMany({
    where: { userId: session.user.id, companyId },
  });

  return NextResponse.json({ followed: false });
}
