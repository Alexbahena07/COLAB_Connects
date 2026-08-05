import { prisma } from "@/lib/prisma";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";
import {
  ACCOUNT_DELETION_REASONS,
  ACCOUNT_DELETION_REASON_LABELS,
  type AccountDeletionReason,
} from "@/lib/accountDeletion";

async function getData() {
  const [grouped, recent, total] = await Promise.all([
    prisma.accountDeletionFeedback.groupBy({
      by: ["reason"],
      _count: { reason: true },
    }),
    prisma.accountDeletionFeedback.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.accountDeletionFeedback.count(),
  ]);

  const countsByReason = new Map(grouped.map((g) => [g.reason, g._count.reason]));

  return { countsByReason, recent, total };
}

export default async function AccountDeletionsPage() {
  const { countsByReason, recent, total } = await getData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Account deletions</h1>
        <p className="mt-1 text-sm text-muted">
          {total} account{total === 1 ? "" : "s"} deleted in total, with reasons users gave when leaving.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">By reason</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ACCOUNT_DELETION_REASONS.map((reason) => (
            <div key={reason} className="rounded-2xl border border-border bg-surface px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {ACCOUNT_DELETION_REASON_LABELS[reason]}
              </p>
              <p className="mt-1 text-2xl font-bold text-foreground">{countsByReason.get(reason) ?? 0}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Recent feedback</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted">No account deletions yet.</p>
        ) : (
          <Table>
            <TableHead>
              <Th>Date</Th>
              <Th>Account type</Th>
              <Th>Reason</Th>
              <Th>Details</Th>
            </TableHead>
            <TableBody>
              {recent.map((entry) => (
                <tr key={entry.id}>
                  <Td>{new Date(entry.createdAt).toLocaleDateString()}</Td>
                  <Td>{entry.accountType ?? "—"}</Td>
                  <Td>{ACCOUNT_DELETION_REASON_LABELS[entry.reason as AccountDeletionReason]}</Td>
                  <Td className="max-w-xs">{entry.otherReason ?? "—"}</Td>
                </tr>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
