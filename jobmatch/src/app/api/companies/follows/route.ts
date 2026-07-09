import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const follows = await prisma.companyFollow.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          image: true,
          companyProfile: { select: { companyName: true } },
        },
      },
    },
  });

  const companies = follows.map((follow) => ({
    companyId: follow.company.id,
    companyName: follow.company.companyProfile?.companyName ?? follow.company.name ?? "A company",
    companyImage: follow.company.image,
    followedAt: follow.createdAt.toISOString(),
  }));

  return NextResponse.json({ companies });
}
