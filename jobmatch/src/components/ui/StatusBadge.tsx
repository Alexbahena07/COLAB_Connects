const TONE_CLASSES: Record<"neutral" | "positive" | "warning" | "negative", string> = {
  neutral: "bg-surface text-muted border-border",
  positive: "bg-green-50 text-green-700 border-green-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  negative: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_TONE: Record<string, keyof typeof TONE_CLASSES> = {
  ACTIVE: "positive",
  DEACTIVATED: "warning",
  BANNED: "negative",
  PENDING: "warning",
  APPROVED: "positive",
  REJECTED: "negative",
  DRAFT: "neutral",
  PUBLISHED: "positive",
  CLOSED: "neutral",
  SUBMITTED: "neutral",
  ACCEPTED: "positive",
  WAITLISTED: "warning",
  FLAGGED: "negative",
};

export default function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? "neutral";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${TONE_CLASSES[tone]}`}
    >
      {status.toLowerCase().replace(/_/g, " ")}
    </span>
  );
}
