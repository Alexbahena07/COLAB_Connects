import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Posting a company event already requires a GOLD/PLATINUM sponsorship (see
// the POST handler in src/app/api/events/route.ts), so — unlike jobs — there's
// no FREE/SILVER tier to boost above; every event in this feed is already
// sponsor-only content. That also means a separate "featured strip" doesn't
// make sense here (it would just be the whole feed). Events have no
// skills/location fields to match against either, so the best available
// relevance signal is whether the student already follows the posting
// company — a real, deliberate signal, not a proxy.
const TIER_BOOST: Record<string, number> = {
  PLATINUM: 15,
  GOLD: 5,
  SILVER: 0,
  FREE: 0,
};

async function getFollowedCompanyIds(userId: string | undefined): Promise<string[]> {
  if (!userId) return [];
  const follows = await prisma.companyFollow.findMany({
    where: { userId },
    select: { companyId: true },
  });
  return follows.map((f) => f.companyId);
}

// Recency decay + a flat "you follow this company" bonus + a smaller boost
// for PLATINUM over GOLD, computed and ORDER BY'd in Postgres (same reasoning
// as the job feed in src/lib/jobRanking.ts) so it stays cheap regardless of
// how many event posts pile up.
export async function getRankedEventIds(
  forUserId: string | undefined,
  pagination: { skip: number; take: number } | null = null
): Promise<string[]> {
  const followedCompanyIds = await getFollowedCompanyIds(forUserId);

  const followBoostExpr =
    followedCompanyIds.length > 0
      ? Prisma.sql`CASE WHEN e."companyId" IN (${Prisma.join(followedCompanyIds)}) THEN 20 ELSE 0 END`
      : Prisma.sql`0`;

  const limitClause = pagination
    ? Prisma.sql`LIMIT ${pagination.take} OFFSET ${pagination.skip}`
    : Prisma.sql``;

  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT e.id
    FROM "CompanyEventPost" e
    LEFT JOIN "CompanyProfile" cp ON cp."userId" = e."companyId"
    ORDER BY (
      40 * exp(-EXTRACT(EPOCH FROM (now() - e."createdAt")) / 864000.0)
      + ${followBoostExpr}
      + CASE cp."sponsorTier"
          WHEN 'PLATINUM' THEN ${TIER_BOOST.PLATINUM}
          WHEN 'GOLD' THEN ${TIER_BOOST.GOLD}
          ELSE 0 END
    ) DESC
    ${limitClause}
  `);

  return rows.map((row) => row.id);
}
