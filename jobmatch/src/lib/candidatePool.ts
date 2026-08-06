import { Prisma } from "@prisma/client";

export const CANDIDATE_POOL_DELAY_MS = 25 * 60 * 60 * 1000;

// Matches the exact audience the company candidate search shows: verified
// students, active, and held back for 25h post-verification. Anything that
// needs to confirm "is this actually a pool candidate" (like unsolicited
// messaging from the candidate page) should check against this same filter
// so it never authorizes something the search itself wouldn't surface.
export function candidatePoolWhere(): Prisma.UserWhereInput {
  return {
    accountType: "STUDENT",
    status: "ACTIVE",
    emailVerified: { not: null, lte: new Date(Date.now() - CANDIDATE_POOL_DELAY_MS) },
  };
}
