export type SponsorTier = "FREE" | "SILVER" | "GOLD" | "PLATINUM";

// Admins get every benefit a Platinum sponsor would, regardless of what
// tier (if any) is actually set on their company profile.
export function getEffectiveSponsorTier(
  isAdmin: boolean,
  actualTier: SponsorTier | null | undefined
): SponsorTier {
  if (isAdmin) return "PLATINUM";
  return actualTier ?? "FREE";
}
