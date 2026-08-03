// Shared between the client-side dropdown and the server-side request
// validation, so the two can never drift out of sync.
export const SUPPORT_CATEGORIES = [
  "Account & login",
  "Applications & jobs",
  "Billing & sponsorship",
  "Bug report",
  "Other",
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];
