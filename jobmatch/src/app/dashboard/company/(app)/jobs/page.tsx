import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEffectiveSponsorTier } from "@/lib/sponsorTier";
import CompanyPostsPageClient from "@/components/company/CompanyPostsPageClient";

export default async function CompanyJobsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.accountType !== "COMPANY") redirect("/dashboard/profile");

  const companyProfile = await prisma.companyProfile.findUnique({
    where: { userId: session.user.id },
    select: { sponsorTier: true },
  });

  const sponsorTier = getEffectiveSponsorTier(Boolean(session.user.isAdmin), companyProfile?.sponsorTier, session.user.accountType);

  return <CompanyPostsPageClient sponsorTier={sponsorTier} />;
}
