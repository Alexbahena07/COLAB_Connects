import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const FEATURED_LIMIT = 4;

const TIER_BOOST: Record<string, number> = {
  PLATINUM: 15,
  GOLD: 10,
  SILVER: 5,
  FREE: 0,
};

type Signals = {
  studentSkillIds: string[];
  locationTokens: string[];
};

// Approved jobs from GOLD/PLATINUM sponsors get a small number of guaranteed
// top slots — what sponsors are actually paying for — kept separate from
// relevance so a low-fit sponsored job can't bury a strong organic match.
// The rest of the list is still influenced by tier via TIER_BOOST below.
async function getFeaturedJobIds(excludeCompanyId?: string): Promise<string[]> {
  const featured = await prisma.job.findMany({
    where: {
      status: "APPROVED",
      ...(excludeCompanyId ? { companyId: { not: excludeCompanyId } } : {}),
      company: {
        companyProfile: { sponsorTier: { in: ["GOLD", "PLATINUM"] } },
      },
    },
    orderBy: { postedAt: "desc" },
    take: FEATURED_LIMIT,
    select: { id: true },
  });
  return featured.map((job) => job.id);
}

async function getSignalsForUser(userId: string | undefined): Promise<Signals> {
  if (!userId) return { studentSkillIds: [], locationTokens: [] };

  const profile = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      accountType: true,
      userSkills: { select: { skillId: true } },
      profile: { select: { desiredLocation: true } },
    },
  });

  if (!profile || profile.accountType !== "STUDENT") {
    return { studentSkillIds: [], locationTokens: [] };
  }

  const locationTokens = (profile.profile?.desiredLocation ?? "")
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);

  return {
    studentSkillIds: profile.userSkills.map((s) => s.skillId),
    locationTokens,
  };
}

// Recency + skill-overlap + location-match + sponsor-tier-boost, computed in
// Postgres so ORDER BY/LIMIT/OFFSET happen at the database instead of
// pulling every row into the app to sort in memory. Scales the same way at
// a hundred listings as it does at a hundred thousand.
async function getRankedJobIds(
  excludedIds: string[],
  signals: Signals,
  pagination: { skip: number; take: number } | null
): Promise<string[]> {
  const { studentSkillIds, locationTokens } = signals;

  const skillMatchJoin =
    studentSkillIds.length > 0
      ? Prisma.sql`
        LEFT JOIN (
          SELECT js."jobId", COUNT(*) AS matched
          FROM "JobSkill" js
          WHERE js."skillId" IN (${Prisma.join(studentSkillIds)})
          GROUP BY js."jobId"
        ) skill_matches ON skill_matches."jobId" = j.id`
      : Prisma.sql``;

  const skillScoreExpr =
    studentSkillIds.length > 0
      ? Prisma.sql`CASE WHEN skill_totals.total > 0
          THEN 35.0 * COALESCE(skill_matches.matched, 0) / skill_totals.total
          ELSE 0 END`
      : Prisma.sql`0`;

  const locationOr =
    locationTokens.length > 0
      ? Prisma.join(
          locationTokens.map((token) => Prisma.sql`j.location ILIKE ${`%${token}%`}`),
          " OR "
        )
      : Prisma.sql`FALSE`;

  const excludeClause =
    excludedIds.length > 0
      ? Prisma.sql`AND j.id NOT IN (${Prisma.join(excludedIds)})`
      : Prisma.sql``;

  const limitClause = pagination
    ? Prisma.sql`LIMIT ${pagination.take} OFFSET ${pagination.skip}`
    : Prisma.sql``;

  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT j.id
    FROM "Job" j
    LEFT JOIN "CompanyProfile" cp ON cp."userId" = j."companyId"
    LEFT JOIN (
      SELECT "jobId", COUNT(*) AS total FROM "JobSkill" GROUP BY "jobId"
    ) skill_totals ON skill_totals."jobId" = j.id
    ${skillMatchJoin}
    WHERE j.status = 'APPROVED' ${excludeClause}
    ORDER BY (
      40 * exp(-EXTRACT(EPOCH FROM (now() - j."postedAt")) / 864000.0)
      + ${skillScoreExpr}
      + CASE WHEN j.remote OR (${locationOr}) THEN 15 ELSE 0 END
      + CASE cp."sponsorTier"
          WHEN 'PLATINUM' THEN ${TIER_BOOST.PLATINUM}
          WHEN 'GOLD' THEN ${TIER_BOOST.GOLD}
          WHEN 'SILVER' THEN ${TIER_BOOST.SILVER}
          ELSE 0 END
    ) DESC
    ${limitClause}
  `);

  return rows.map((row) => row.id);
}

export type RankedJobIds = {
  orderedIds: string[];
  featuredIds: Set<string>;
};

// Returns approved job ids in display order: a small featured strip from
// GOLD/PLATINUM sponsors first, then the rest ranked by relevance to
// `forUserId` (if a student) blended with recency and a smaller tier boost.
// `pagination` only limits the *non-featured* portion, since the featured
// strip is a fixed-size slot rather than a page of results.
export async function getRankedJobIdsForFeed(
  forUserId: string | undefined,
  pagination: { skip: number; take: number } | null = null
): Promise<RankedJobIds> {
  const [signals, featuredIds] = await Promise.all([
    getSignalsForUser(forUserId),
    getFeaturedJobIds(),
  ]);

  const rankedIds = await getRankedJobIds(featuredIds, signals, pagination);

  return {
    orderedIds: [...featuredIds, ...rankedIds],
    featuredIds: new Set(featuredIds),
  };
}
