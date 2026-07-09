import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEffectiveSponsorTier } from "@/lib/sponsorTier";
import CandidatesPageClient from "@/components/company/CandidatesPageClient";

export default async function CompanyCandidatesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const companyProfile = await prisma.companyProfile.findUnique({
    where: { userId: session.user.id },
    select: { sponsorTier: true },
  });

  const sponsorTier = getEffectiveSponsorTier(Boolean(session.user.isAdmin), companyProfile?.sponsorTier);

  if (sponsorTier === "FREE") {
    return (
      <main className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto bg-background p-6 text-foreground">
        <div className="w-full max-w-lg rounded-3xl border border-border bg-surface p-8 text-center shadow-sm">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
              <path d="M11 8v3M11 14h.01" />
            </svg>
          </span>
          <h1 className="mt-4 text-xl font-bold text-foreground">Search candidates is a sponsor feature</h1>
          <p className="mt-2 text-sm text-foreground/70">
            Candidate search lets you browse and filter the full pool of early-career talent on COLAB
            Connects — searchable by skill, location, and experience — instead of waiting for applicants
            to come to you. It&apos;s available to Silver, Gold, and Platinum sponsors.
          </p>
          <Link
            href="/dashboard/company/application#sponsorship"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            See sponsorship tiers
          </Link>
        </div>
      </main>
    );
  }

  return <CandidatesPageClient />;
}
