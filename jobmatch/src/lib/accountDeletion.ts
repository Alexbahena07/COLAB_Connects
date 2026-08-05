export const ACCOUNT_DELETION_REASONS = [
  "FOUND_A_JOB",
  "NOT_USEFUL",
  "TOO_MANY_EMAILS",
  "PRIVACY_CONCERNS",
  "DIFFICULT_TO_USE",
  "CREATING_ANOTHER_ACCOUNT",
  "OTHER",
] as const;

export type AccountDeletionReason = (typeof ACCOUNT_DELETION_REASONS)[number];

export const ACCOUNT_DELETION_REASON_LABELS: Record<AccountDeletionReason, string> = {
  FOUND_A_JOB: "I found a job or internship",
  NOT_USEFUL: "I'm not finding it useful",
  TOO_MANY_EMAILS: "Too many emails or notifications",
  PRIVACY_CONCERNS: "Privacy or data concerns",
  DIFFICULT_TO_USE: "The site is difficult to use",
  CREATING_ANOTHER_ACCOUNT: "I'm creating a different account",
  OTHER: "Other",
};
