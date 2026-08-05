// Seeds one demo company account that has both job listings and event posts,
// for beta testers to preview a company that shows up in both tabs of the
// opportunities board at once.
//
//   node scripts/seed-demo-mixed-company.js            create/reset the demo company
//   node scripts/seed-demo-mixed-company.js --remove   delete the demo company + its listings
//
// This is a separate demo company from scripts/seed-demo-jobs.js and
// scripts/seed-demo-events.js on purpose: each script's reset step deletes
// and recreates its own company, and sharing one account between them would
// let running one script silently wipe out another's data. Job.company and
// CompanyEventPost.company both cascade-delete, so deleting the one demo
// User row here removes every fake job and event post with it.
const { PrismaClient } = require("@prisma/client");

const DEMO_EMAIL = "demo-mixed@colabconnects.internal";
const DEMO_COMPANY_NAME = "[TEST DATA] Demo Mixed Company — not a real company";
const DEMO_COMPANY_IMAGE = "/photos/workInProgress.jpg";
const TITLE_PREFIX = "[TEST] ";
const JOB_NOTICE =
  "⚠️ THIS IS TEST DATA — not a real job posting. It exists only to preview job listing layouts during beta testing and can be removed at any time. ⚠️\n\n";
const EVENT_NOTICE =
  "⚠️ THIS IS TEST DATA — not a real event. It exists only to preview event card layouts during beta testing and can be removed at any time. ⚠️\n\n";

const jobs = [
  {
    title: "Investment Banking Analyst",
    location: "New York, NY",
    type: "FULL_TIME",
    remote: false,
    description: JOB_NOTICE +
      "Support deal teams on financial modeling, valuation, and pitch materials for M&A and capital markets transactions.",
    skills: ["Financial Modeling", "Valuation", "Excel"],
  },
  {
    title: "Private Equity Summer Intern",
    location: "Chicago, IL",
    type: "INTERNSHIP",
    remote: false,
    description: JOB_NOTICE +
      "This is a short sample description used to check how compact listings render in cards and detail views.",
    skills: ["Financial Modeling", "Excel", "Due Diligence"],
  },
];

const events = [
  {
    title: "Fall Networking Mixer",
    about: EVENT_NOTICE + "Meet recruiters and alumni from sponsor firms over light refreshments.",
    link: "https://colabconnects.org",
    linkLabel: "RSVP",
    imageUrl: DEMO_COMPANY_IMAGE,
  },
  {
    title: "Resume Workshop for First-Gen Students",
    about: EVENT_NOTICE + "Short sample description used to check how compact event cards render.",
    link: null,
    linkLabel: null,
    imageUrl: null,
  },
];

async function removeDemoData(prisma) {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!existing) {
    console.log("No demo mixed company found — nothing to remove.");
    return;
  }
  // Job.company and CompanyEventPost.company both cascade on delete, so this
  // one call removes the company, its jobs, its event posts, and any
  // applications against them.
  await prisma.user.delete({ where: { id: existing.id } });
  console.log(`Removed demo mixed company ${DEMO_EMAIL} and all of its listings.`);
}

async function seedDemoData(prisma) {
  await removeDemoData(prisma); // reset so re-running never duplicates

  const company = await prisma.user.create({
    data: {
      name: DEMO_COMPANY_NAME,
      email: DEMO_EMAIL,
      password: null,
      image: DEMO_COMPANY_IMAGE,
      accountType: "COMPANY",
      status: "ACTIVE",
      companyProfile: {
        create: {
          companyName: DEMO_COMPANY_NAME,
          about: "Fake company created for beta-testing a company with both jobs and events. Safe to delete at any time.",
          approvalStatus: "APPROVED",
        },
      },
    },
  });

  for (const job of jobs) {
    const created = await prisma.job.create({
      data: {
        companyId: company.id,
        title: TITLE_PREFIX + job.title,
        location: job.location,
        type: job.type,
        remote: job.remote,
        description: job.description,
        status: "APPROVED",
      },
    });

    if (job.skills.length > 0) {
      await prisma.skill.createMany({
        data: job.skills.map((name) => ({ name })),
        skipDuplicates: true,
      });
      const skillRows = await prisma.skill.findMany({
        where: { name: { in: job.skills } },
        select: { id: true },
      });
      await prisma.jobSkill.createMany({
        data: skillRows.map((s) => ({ jobId: created.id, skillId: s.id })),
        skipDuplicates: true,
      });
    }

    console.log(`Created job: ${created.title}`);
  }

  for (const event of events) {
    const created = await prisma.companyEventPost.create({
      data: {
        companyId: company.id,
        title: TITLE_PREFIX + event.title,
        about: event.about,
        link: event.link,
        linkLabel: event.linkLabel,
        imageUrl: event.imageUrl,
      },
    });
    console.log(`Created event: ${created.title}`);
  }

  console.log(`\nDone. Seeded ${jobs.length} job(s) and ${events.length} event(s) under ${DEMO_EMAIL}.`);
  console.log("Run `node scripts/seed-demo-mixed-company.js --remove` to delete them all.");
}

async function main() {
  const prisma = new PrismaClient();
  const shouldRemove = process.argv.includes("--remove");
  try {
    if (shouldRemove) {
      await removeDemoData(prisma);
    } else {
      await seedDemoData(prisma);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
