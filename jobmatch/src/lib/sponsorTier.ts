export type SponsorTier = "FREE" | "SILVER" | "GOLD" | "PLATINUM";
export type AccountType = "STUDENT" | "COMPANY";

// Company admins get every benefit a Platinum sponsor would, regardless of
// what tier (if any) is actually set on their company profile. Admins whose
// account is a student account do not get company sponsorship benefits.
export function getEffectiveSponsorTier(
  isAdmin: boolean,
  actualTier: SponsorTier | null | undefined,
  accountType?: AccountType | null
): SponsorTier {
  if (isAdmin && accountType === "COMPANY") return "PLATINUM";
  return actualTier ?? "FREE";
}

export function canPostEvents(tier: SponsorTier): boolean {
  return tier === "GOLD" || tier === "PLATINUM";
}
