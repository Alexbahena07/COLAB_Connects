import Link from "next/link";
import { prisma } from "@/lib/prisma";

async function getCounts() {
  const [
    totalUsers,
    students,
    companies,
    flaggedUsers,
    bannedOrDeactivated,
    pendingCompanies,
    rejectedJobs,
    totalEvents,
    publishedEvents,
    totalApplications,
    accountsDeleted,
    appStats,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { accountType: "STUDENT" } }),
    prisma.user.count({ where: { accountType: "COMPANY" } }),
    prisma.user.count({ where: { flagged: true } }),
    prisma.user.count({ where: { status: { in: ["DEACTIVATED", "BANNED"] } } }),
    prisma.companyProfile.count({ where: { approvalStatus: "PENDING" } }),
    prisma.job.count({ where: { status: "REJECTED" } }),
    prisma.event.count(),
    prisma.event.count({ where: { status: "PUBLISHED" } }),
    prisma.eventApplication.count(),
    prisma.accountDeletionFeedback.count(),
    prisma.appStats.findUnique({ where: { id: "singleton" } }),
  ]);

  return {
    totalUsers,
    students,
    companies,
    flaggedUsers,
    bannedOrDeactivated,
    pendingCompanies,
    rejectedJobs,
    totalEvents,
    publishedEvents,
    totalApplications,
    accountsDeleted,
    // Falls back to the live count if the counter row hasn't been seeded yet.
    totalUsersCreated: appStats?.totalUsersCreated ?? totalUsers,
  };
}

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-border bg-surface px-5 py-4 transition-colors hover:border-brand"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </Link>
  );
}

export default async function AdminOverviewPage() {
  const counts = await getCounts();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin overview</h1>
        <p className="mt-1 text-sm text-muted">Quick snapshot of accounts, moderation queue, and events.</p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Users</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total users" value={counts.totalUsers} href="/admin/users" />
          <StatCard label="Students" value={counts.students} href="/admin/users?accountType=STUDENT" />
          <StatCard label="Companies" value={counts.companies} href="/admin/users?accountType=COMPANY" />
          <StatCard label="Flagged" value={counts.flaggedUsers} href="/admin/users?flagged=true" />
          <StatCard
            label="Total users created (all-time)"
            value={counts.totalUsersCreated}
            href="/admin/users"
          />
          <StatCard
            label="Accounts deleted"
            value={counts.accountsDeleted}
            href="/admin/account-deletions"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Moderation</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Deactivated / banned"
            value={counts.bannedOrDeactivated}
            href="/admin/users?status=BANNED"
          />
          <StatCard
            label="Companies pending review"
            value={counts.pendingCompanies}
            href="/admin/companies?status=PENDING"
          />
          <StatCard label="Rejected jobs" value={counts.rejectedJobs} href="/admin/jobs?status=REJECTED" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Career Forum</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total events" value={counts.totalEvents} href="/admin/events" />
          <StatCard label="Published events" value={counts.publishedEvents} href="/admin/events" />
          <StatCard label="Total applications" value={counts.totalApplications} href="/admin/events" />
        </div>
      </section>
    </div>
  );
}
