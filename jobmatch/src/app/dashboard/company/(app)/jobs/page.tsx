import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEffectiveSponsorTier } from "@/lib/sponsorTier";
import JobsPageClient from "@/components/company/JobsPageClient";

export default async function CompanyJobsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const companyProfile = await prisma.companyProfile.findUnique({
    where: { userId: session.user.id },
    select: { sponsorTier: true },
  });

  const sponsorTier = getEffectiveSponsorTier(Boolean(session.user.isAdmin), companyProfile?.sponsorTier);

  return <JobsPageClient sponsorTier={sponsorTier} />;
}
