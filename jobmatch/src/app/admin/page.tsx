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
