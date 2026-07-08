import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  // Query from User so company accounts with no CompanyProfile (created before
  // the approval process) are still visible in the admin dashboard.
  const users = await prisma.user.findMany({
    where: { accountType: "COMPANY" },
    orderBy: { createdAt: "desc" },
    include: {
      companyProfile: {
        include: { approvedBy: { select: { name: true, email: true } } },
      },
    },
  });

  const mapped = users.map((u) => ({
    userId: u.id,
    companyName: u.companyProfile?.companyName ?? u.name ?? "—",
    website: u.companyProfile?.website ?? null,
    headquarters: u.companyProfile?.headquarters ?? null,
    teamSize: u.companyProfile?.teamSize ?? null,
    approvalStatus: u.companyProfile?.approvalStatus ?? "NO_PROFILE",
    approvedAt: u.companyProfile?.approvedAt?.toISOString() ?? null,
    approvedByName:
      u.companyProfile?.approvedBy?.name ??
      u.companyProfile?.approvedBy?.email ??
      null,
    user: {
      id: u.id,
      name: u.name,
      email: u.email,
      status: u.status,
      createdAt: u.createdAt.toISOString(),
    },
  }));

  // Apply status filter — "NO_PROFILE" accounts only show in the All tab.
  const filtered =
    status === "PENDING" || status === "APPROVED" || status === "REJECTED"
      ? mapped.filter((c) => c.approvalStatus === status)
      : mapped;

  return NextResponse.json({ companies: filtered });
}
