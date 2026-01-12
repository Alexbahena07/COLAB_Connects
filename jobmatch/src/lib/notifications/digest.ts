import { prisma } from "@/lib/prisma";

export type DigestFrequency = "DAILY" | "WEEKLY";

export type DigestPayload = {
  userId: string;
  email: string;
  subject: string;
  html: string;
  text: string;
  eventIds: string[];
};

type DigestEvent = {
  id: string;
  jobId: string;
  jobTitle: string;
  createdAt: Date;
  companyId: string;
  companyName: string;
};

type DigestJob = {
  id: string;
  title: string;
  createdAt: Date;
};

type CompanyGroup = {
  companyId: string;
  companyName: string;
  jobs: DigestJob[];
};

const DEFAULT_APP_URL = "http://localhost:3000";

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);

const getAppUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || DEFAULT_APP_URL;

const buildSubject = (frequency: DigestFrequency, count: number) => {
  const prefix = frequency === "DAILY" ? "Daily" : "Weekly";
  const plural = count === 1 ? "job" : "jobs";
  return `${prefix} job digest: ${count} new ${plural}`;
};

const buildIntro = (frequency: DigestFrequency) =>
  frequency === "DAILY"
    ? "Here are today's new job postings from companies you follow."
    : "Here are this week's new job postings from companies you follow.";

const buildTextDigest = (intro: string, groups: CompanyGroup[], appUrl: string) => {
  const lines = [intro, ""];
  groups.forEach((group) => {
    lines.push(`${group.companyName}`);
    group.jobs.forEach((job) => {
      lines.push(`- ${job.title} (${appUrl}/dashboard?jobId=${job.id})`);
    });
    lines.push("");
  });
  lines.push(`View all jobs: ${appUrl}/dashboard`);
  return lines.join("\n");
};

const buildHtmlDigest = (intro: string, groups: CompanyGroup[], appUrl: string) => {
  const companyBlocks = groups
    .map(
      (group) =>
        `
        <div style="margin-bottom:24px;">
          <h3 style="margin:0 0 8px;font-size:16px;color:#1f2a44;">${group.companyName}</h3>
          <ul style="margin:0;padding-left:18px;color:#1f2a44;">
            ${group.jobs
              .map(
                (job) =>
                  `<li style="margin-bottom:6px;">
                    <a href="${appUrl}/dashboard?jobId=${job.id}" style="color:#2f5bff;text-decoration:none;">${job.title}</a>
                    <span style="color:#6b7280;font-size:12px;"> · ${formatDate(job.createdAt)}</span>
                  </li>`
              )
              .join("")}
          </ul>
        </div>
      `
    )
    .join("");

  return `
    <div style="font-family:Arial, sans-serif; color:#1f2a44;">
      <h2 style="margin:0 0 12px; font-size:20px;">${intro}</h2>
      ${companyBlocks}
      <a href="${appUrl}/dashboard" style="display:inline-block;background:#2f5bff;color:#ffffff;padding:10px 16px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">View all jobs</a>
    </div>
  `;
};

const groupEventsByCompany = (events: DigestEvent[]) => {
  const groups = new Map<string, CompanyGroup>();
  events.forEach((event) => {
    const existing = groups.get(event.companyId) ?? {
      companyId: event.companyId,
      companyName: event.companyName,
      jobs: [],
    };
    existing.jobs.push({
      id: event.jobId,
      title: event.jobTitle,
      createdAt: event.createdAt,
    });
    groups.set(event.companyId, existing);
  });

  return Array.from(groups.values()).map((group) => ({
    ...group,
    jobs: group.jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
  }));
};

const getWindowStart = (frequency: DigestFrequency) => {
  const now = new Date();
  const hours = frequency === "DAILY" ? 24 : 24 * 7;
  return new Date(now.getTime() - hours * 60 * 60 * 1000);
};

export const buildDigests = async (frequency: DigestFrequency): Promise<DigestPayload[]> => {
  const users = await prisma.user.findMany({
    where: {
      notificationFrequency: frequency,
      email: { not: null },
    },
    select: { id: true, email: true },
  });

  if (users.length === 0) return [];

  const windowStart = getWindowStart(frequency);
  const appUrl = getAppUrl();
  const payloads: DigestPayload[] = [];

  for (const user of users) {
    const events = await prisma.jobPostEvent.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: windowStart },
        emailedAt: null,
      },
      orderBy: { createdAt: "desc" },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            companyProfile: { select: { companyName: true } },
          },
        },
      },
    });

    if (events.length === 0) continue;

    const digestEvents: DigestEvent[] = events.map((event) => ({
      id: event.id,
      jobId: event.jobId,
      jobTitle: event.jobTitle,
      createdAt: event.createdAt,
      companyId: event.companyId,
      companyName:
        event.company.companyProfile?.companyName ?? event.company.name ?? "Company",
    }));

    const groups = groupEventsByCompany(digestEvents);
    const intro = buildIntro(frequency);
    const subject = buildSubject(frequency, events.length);
    const text = buildTextDigest(intro, groups, appUrl);
    const html = buildHtmlDigest(intro, groups, appUrl);

    payloads.push({
      userId: user.id,
      email: user.email ?? "",
      subject,
      html,
      text,
      eventIds: events.map((event) => event.id),
    });
  }

  return payloads;
};

export const markEventsEmailed = async (eventIds: string[]) => {
  if (eventIds.length === 0) return 0;
  const result = await prisma.jobPostEvent.updateMany({
    where: { id: { in: eventIds } },
    data: { emailedAt: new Date() },
  });
  return result.count;
};
