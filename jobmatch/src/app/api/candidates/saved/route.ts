import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const getCompanyUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, accountType: true },
  });
  return user && user.accountType === "COMPANY" ? user : null;
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyUser = await getCompanyUser(session.user.id);
  if (!companyUser) {
    return NextResponse.json(
      { error: "Only company accounts can view saved candidates" },
      { status: 403 }
    );
  }

  const saved = await prisma.savedCandidate.findMany({
    where: { companyId: companyUser.id },
    select: { candidateId: true },
  });

  return NextResponse.json({ savedCandidateIds: saved.map((item) => item.candidateId) });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyUser = await getCompanyUser(session.user.id);
  if (!companyUser) {
    return NextResponse.json(
      { error: "Only company accounts can save candidates" },
      { status: 403 }
    );
  }

  const payload = await request.json().catch(() => null);
  const candidateId = typeof payload?.candidateId === "string" ? payload.candidateId : null;
  if (!candidateId) {
    return NextResponse.json({ error: "candidateId is required" }, { status: 400 });
  }

  await prisma.savedCandidate.upsert({
    where: { companyId_candidateId: { companyId: companyUser.id, candidateId } },
    update: {},
    create: {
      companyId: companyUser.id,
      candidateId,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyUser = await getCompanyUser(session.user.id);
  if (!companyUser) {
    return NextResponse.json(
      { error: "Only company accounts can remove saved candidates" },
      { status: 403 }
    );
  }

  const payload = await request.json().catch(() => null);
  const candidateId = typeof payload?.candidateId === "string" ? payload.candidateId : null;
  if (!candidateId) {
    return NextResponse.json({ error: "candidateId is required" }, { status: 400 });
  }

  await prisma.savedCandidate.deleteMany({
    where: { companyId: companyUser.id, candidateId },
  });

  return NextResponse.json({ ok: true });
}
