import { prisma } from "@/lib/prisma";
import { OrdinalBarList, MagnitudeBarList, StackedStatusBar, MonthlySignupsChart } from "./_components/Charts";

const SPONSOR_TIER_ORDER = ["FREE", "SILVER", "GOLD", "PLATINUM"] as const;
const SPONSOR_TIER_LABELS: Record<string, string> = {
  FREE: "Free",
  SILVER: "Silver",
  GOLD: "Gold",
  PLATINUM: "Platinum",
};

const JOB_TYPE_ORDER = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"] as const;
const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
};

function fillOrder(order: readonly string[], counts: Map<string, number>, labels: Record<string, string>) {
  return order.map((key) => ({ key, label: labels[key], value: counts.get(key) ?? 0 }));
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatCents(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

async function getAnalytics() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [
    tierGroups,
    approvalGroups,
    sponsorRevenueGroups,
    totalRevenue,
    totalSponsorPayments,
    userTypeGroups,
    totalCompanies,
    jobStatusGroups,
    jobTypeGroups,
    remoteJobs,
    totalJobs,
    totalJobApplications,
    eventStatusGroups,
    totalEventApplications,
    recentUsers,
    studentStatusGroups,
    openToWorkCount,
    resumeOnFileCount,
    followingGroups,
    topSkillGroups,
  ] = await Promise.all([
    prisma.companyProfile.groupBy({ by: ["sponsorTier"], _count: true }),
    prisma.companyProfile.groupBy({ by: ["approvalStatus"], _count: true }),
    prisma.sponsor.groupBy({ by: ["tier"], where: { status: "COMPLETED" }, _sum: { amountPaid: true }, _count: true }),
    prisma.sponsor.aggregate({ where: { status: "COMPLETED" }, _sum: { amountPaid: true } }),
    prisma.sponsor.count({ where: { status: "COMPLETED" } }),
    prisma.user.groupBy({ by: ["accountType"], _count: true }),
    prisma.companyProfile.count(),
    prisma.job.groupBy({ by: ["status"], _count: true }),
    prisma.job.groupBy({ by: ["type"], _count: true }),
    prisma.job.count({ where: { remote: true } }),
    prisma.job.count(),
    prisma.jobApplication.count(),
    prisma.event.groupBy({ by: ["status"], _count: true }),
    prisma.eventApplication.count(),
    prisma.user.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true, accountType: true },
    }),
    prisma.user.groupBy({ by: ["status"], where: { accountType: "STUDENT" }, _count: true }),
    prisma.profile.count({ where: { openToWork: true, user: { accountType: "STUDENT" } } }),
    prisma.profile.count({ where: { resumeUrl: { not: null }, user: { accountType: "STUDENT" } } }),
    prisma.companyFollow.groupBy({ by: ["userId"], where: { user: { accountType: "STUDENT" } } }),
    prisma.userSkill.groupBy({
      by: ["skillId"],
      where: { user: { accountType: "STUDENT" } },
      _count: true,
      orderBy: { _count: { skillId: "desc" } },
      take: 8,
    }),
  ]);

  const topSkills = await prisma.skill.findMany({
    where: { id: { in: topSkillGroups.map((g) => g.skillId) } },
    select: { id: true, name: true },
  });
  const skillNameById = new Map(topSkills.map((s) => [s.id, s.name]));

  const tierCounts = new Map(tierGroups.map((g) => [g.sponsorTier, g._count]));
  const approvalCounts = new Map(approvalGroups.map((g) => [g.approvalStatus, g._count]));
  const jobStatusCounts = new Map(jobStatusGroups.map((g) => [g.status, g._count]));
  const jobTypeCounts = new Map(jobTypeGroups.map((g) => [g.type, g._count]));
  const eventStatusCounts = new Map(eventStatusGroups.map((g) => [g.status, g._count]));
  const userTypeCounts = new Map(userTypeGroups.map((g) => [g.accountType, g._count]));
  const studentStatusCounts = new Map(studentStatusGroups.map((g) => [g.status, g._count]));

  const revenueByTier = new Map(
    sponsorRevenueGroups.map((g) => [g.tier, { amount: g._sum.amountPaid ?? 0, count: g._count }])
  );

  const months: { key: string; label: string; student: number; company: number }[] = [];
  const cursor = new Date(sixMonthsAgo);
  for (let i = 0; i < 6; i++) {
    months.push({
      key: monthKey(cursor),
      label: cursor.toLocaleDateString("en-US", { month: "short" }),
      student: 0,
      company: 0,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  const monthByKey = new Map(months.map((m) => [m.key, m]));
  for (const user of recentUsers) {
    const bucket = monthByKey.get(monthKey(user.createdAt));
    if (!bucket) continue;
    if (user.accountType === "STUDENT") bucket.student += 1;
    else if (user.accountType === "COMPANY") bucket.company += 1;
  }

  return {
    tierRows: fillOrder(SPONSOR_TIER_ORDER, tierCounts, SPONSOR_TIER_LABELS),
    approvalSegments: [
      { key: "PENDING", label: "Pending", value: approvalCounts.get("PENDING") ?? 0, tone: "warning" as const },
      { key: "APPROVED", label: "Approved", value: approvalCounts.get("APPROVED") ?? 0, tone: "positive" as const },
      { key: "REJECTED", label: "Rejected", value: approvalCounts.get("REJECTED") ?? 0, tone: "negative" as const },
    ],
    jobTypeRows: fillOrder(JOB_TYPE_ORDER, jobTypeCounts, JOB_TYPE_LABELS),
    jobStatusRows: [
      { key: "APPROVED", label: "Approved", value: jobStatusCounts.get("APPROVED") ?? 0 },
      { key: "REJECTED", label: "Rejected", value: jobStatusCounts.get("REJECTED") ?? 0 },
    ],
    eventStatusRows: [
      { key: "DRAFT", label: "Draft", value: eventStatusCounts.get("DRAFT") ?? 0 },
      { key: "PUBLISHED", label: "Published", value: eventStatusCounts.get("PUBLISHED") ?? 0 },
      { key: "CLOSED", label: "Closed", value: eventStatusCounts.get("CLOSED") ?? 0 },
    ],
    months,
    totalCompanies,
    totalStudents: userTypeCounts.get("STUDENT") ?? 0,
    totalCompanyUsers: userTypeCounts.get("COMPANY") ?? 0,
    totalRevenueCents: totalRevenue._sum.amountPaid ?? 0,
    totalSponsorPayments,
    revenueByTier: (["SILVER", "GOLD", "PLATINUM"] as const).map((tier) => ({
      key: tier,
      label: SPONSOR_TIER_LABELS[tier],
      amountCents: revenueByTier.get(tier)?.amount ?? 0,
      count: revenueByTier.get(tier)?.count ?? 0,
    })),
    remoteJobs,
    totalJobs,
    totalJobApplications,
    totalEventApplications,
    studentStatusSegments: [
      { key: "ACTIVE", label: "Active", value: studentStatusCounts.get("ACTIVE") ?? 0, tone: "positive" as const },
      {
        key: "DEACTIVATED",
        label: "Deactivated",
        value: studentStatusCounts.get("DEACTIVATED") ?? 0,
        tone: "warning" as const,
      },
      { key: "BANNED", label: "Banned", value: studentStatusCounts.get("BANNED") ?? 0, tone: "negative" as const },
    ],
    openToWorkCount,
    resumeOnFileCount,
    studentsFollowingCompanies: followingGroups.length,
    topSkillRows: topSkillGroups.map((g) => ({
      key: g.skillId,
      label: skillNameById.get(g.skillId) ?? "Unknown",
      value: g._count,
    })),
  };
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </div>
  );
}

export default async function AdminAnalyticsPage() {
  const data = await getAnalytics();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="mt-1 text-sm text-muted">
          Sponsorship tiers, revenue, and platform activity at a glance.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Companies" value={data.totalCompanies.toLocaleString("en-US")} />
          <StatCard label="Students" value={data.totalStudents.toLocaleString("en-US")} />
          <StatCard label="Sponsorship revenue" value={formatCents(data.totalRevenueCents)} />
          <StatCard label="Completed payments" value={data.totalSponsorPayments.toLocaleString("en-US")} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Panel title="Companies by sponsor tier">
          <OrdinalBarList rows={data.tierRows} />
        </Panel>

        <Panel title="Revenue by tier">
          <div className="space-y-3">
            {data.revenueByTier.map((row) => (
              <div key={row.key} className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{row.label}</span>
                <span className="text-muted">
                  {row.count.toLocaleString("en-US")} payment{row.count === 1 ? "" : "s"}
                </span>
                <span className="font-semibold text-foreground">{formatCents(row.amountCents)}</span>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section>
        <Panel title="New signups (last 6 months)">
          <MonthlySignupsChart months={data.months} />
        </Panel>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Panel title="Company approval status">
          <StackedStatusBar segments={data.approvalSegments} />
        </Panel>

        <Panel title="Job listings by type">
          <MagnitudeBarList rows={data.jobTypeRows} />
        </Panel>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Students</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total students" value={data.totalStudents.toLocaleString("en-US")} />
          <StatCard label="Open to work" value={data.openToWorkCount.toLocaleString("en-US")} />
          <StatCard label="Resume on file" value={data.resumeOnFileCount.toLocaleString("en-US")} />
          <StatCard label="Following a company" value={data.studentsFollowingCompanies.toLocaleString("en-US")} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Panel title="Student account status">
          <StackedStatusBar segments={data.studentStatusSegments} />
        </Panel>

        <Panel title="Top student skills">
          {data.topSkillRows.length > 0 ? (
            <MagnitudeBarList rows={data.topSkillRows} hueClassName="bg-brandBlue" />
          ) : (
            <p className="text-sm text-muted">No skills added yet.</p>
          )}
        </Panel>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Jobs</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total jobs" value={data.totalJobs.toLocaleString("en-US")} />
          <StatCard
            label="Remote jobs"
            value={`${data.remoteJobs.toLocaleString("en-US")} (${
              data.totalJobs > 0 ? Math.round((data.remoteJobs / data.totalJobs) * 100) : 0
            }%)`}
          />
          <StatCard label="Approved jobs" value={(data.jobStatusRows.find((r) => r.key === "APPROVED")?.value ?? 0).toLocaleString("en-US")} />
          <StatCard label="Job applications" value={data.totalJobApplications.toLocaleString("en-US")} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Career Forum</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Published events" value={(data.eventStatusRows.find((r) => r.key === "PUBLISHED")?.value ?? 0).toLocaleString("en-US")} />
          <StatCard label="Draft events" value={(data.eventStatusRows.find((r) => r.key === "DRAFT")?.value ?? 0).toLocaleString("en-US")} />
          <StatCard label="Closed events" value={(data.eventStatusRows.find((r) => r.key === "CLOSED")?.value ?? 0).toLocaleString("en-US")} />
          <StatCard label="Event applications" value={data.totalEventApplications.toLocaleString("en-US")} />
        </div>
      </section>
    </div>
  );
}
