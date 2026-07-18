// Small presentational chart primitives for the admin analytics page.
// No charting library is installed, so these are plain HTML/CSS bars rather
// than SVG — deliberately simple, since this is an internal dashboard, not a
// public-facing visualization.

function formatCompact(value: number) {
  return value.toLocaleString("en-US");
}

/**
 * Ordinal ramp: one hue (brand purple), monotone opacity from lightest to
 * darkest across the tiers. Tier order carries meaning (FREE < SILVER < GOLD
 * < PLATINUM), so a single-hue ramp — not distinct categorical colors — is
 * the right encoding: darker always means "higher tier."
 */
const TIER_OPACITY: Record<string, string> = {
  FREE: "bg-brand/20",
  SILVER: "bg-brand/45",
  GOLD: "bg-brand/70",
  PLATINUM: "bg-brand",
};

export function OrdinalBarList({
  rows,
}: {
  rows: { key: string; label: string; value: number }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const pct = Math.max((row.value / max) * 100, row.value > 0 ? 3 : 0);
        return (
          <div key={row.key} className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-sm font-medium text-foreground">{row.label}</span>
            <div className="flex-1">
              <div
                className={`h-4 rounded-r ${TIER_OPACITY[row.key] ?? "bg-brand"}`}
                style={{ width: `${pct}%` }}
                title={`${row.label}: ${formatCompact(row.value)}`}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-sm font-semibold text-foreground">
              {formatCompact(row.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Flat single-hue magnitude bars — for nominal categories where only length (not color) carries meaning. */
export function MagnitudeBarList({
  rows,
  hueClassName = "bg-brandBlue",
}: {
  rows: { key: string; label: string; value: number }[];
  hueClassName?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const pct = Math.max((row.value / max) * 100, row.value > 0 ? 3 : 0);
        return (
          <div key={row.key} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-sm font-medium text-foreground">{row.label}</span>
            <div className="flex-1">
              <div
                className={`h-4 rounded-r ${hueClassName}`}
                style={{ width: `${pct}%` }}
                title={`${row.label}: ${formatCompact(row.value)}`}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-sm font-semibold text-foreground">
              {formatCompact(row.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Part-to-whole status funnel. Status colors are reserved and match the app's existing StatusBadge tones. */
const STATUS_FILL: Record<string, string> = {
  positive: "bg-green-500",
  warning: "bg-amber-500",
  negative: "bg-red-500",
  neutral: "bg-border",
};

export function StackedStatusBar({
  segments,
}: {
  segments: { key: string; label: string; value: number; tone: "positive" | "warning" | "negative" | "neutral" }[];
}) {
  const total = Math.max(1, segments.reduce((sum, s) => sum + s.value, 0));

  return (
    <div className="space-y-3">
      <div className="flex h-4 w-full overflow-hidden rounded-md bg-surface">
        {segments.map((seg, i) => {
          const pct = (seg.value / total) * 100;
          if (pct <= 0) return null;
          return (
            <div
              key={seg.key}
              className={`h-full ${STATUS_FILL[seg.tone]} ${i > 0 ? "ml-0.5" : ""}`}
              style={{ width: `${pct}%` }}
              title={`${seg.label}: ${formatCompact(seg.value)}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        {segments.map((seg) => (
          <div key={seg.key} className="flex items-center gap-1.5 text-sm">
            <span className={`h-2.5 w-2.5 rounded-full ${STATUS_FILL[seg.tone]}`} />
            <span className="text-muted">{seg.label}</span>
            <span className="font-semibold text-foreground">{formatCompact(seg.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Grouped columns: two categorical series (Students vs Companies) over the last 6 months. */
export function MonthlySignupsChart({
  months,
}: {
  months: { key: string; label: string; student: number; company: number }[];
}) {
  const max = Math.max(1, ...months.flatMap((m) => [m.student, m.company]));

  return (
    <div>
      <div className="mb-4 flex items-center gap-5">
        <div className="flex items-center gap-1.5 text-sm">
          <span className="h-2.5 w-2.5 rounded-full bg-brandBlue" />
          <span className="text-muted">Students</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <span className="h-2.5 w-2.5 rounded-full bg-brand" />
          <span className="text-muted">Companies</span>
        </div>
      </div>

      <div className="flex h-40 items-end gap-4">
        {months.map((m) => (
          <div key={m.key} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-32 w-full items-end justify-center gap-1">
              <div
                className="w-3 max-w-6 flex-1 rounded-t bg-brandBlue sm:w-6"
                style={{ height: `${Math.max((m.student / max) * 100, m.student > 0 ? 2 : 0)}%` }}
                title={`${m.label}: ${formatCompact(m.student)} students`}
              />
              <div
                className="w-3 max-w-6 flex-1 rounded-t bg-brand sm:w-6"
                style={{ height: `${Math.max((m.company / max) * 100, m.company > 0 ? 2 : 0)}%` }}
                title={`${m.label}: ${formatCompact(m.company)} companies`}
              />
            </div>
            <span className="text-xs font-medium text-muted">{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
