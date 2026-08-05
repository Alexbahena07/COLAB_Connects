// Seeds 15 fake job listings for beta testers to preview the job board UI
// against varied data (job types, remote/on-site, skill counts, description
// and title lengths). Every listing lives under a single, clearly-labeled
// demo company account, so cleanup is one command:
//
//   node scripts/seed-demo-jobs.js            create/reset the demo listings
//   node scripts/seed-demo-jobs.js --remove   delete the demo company + all its listings
//
// Because Job.company (and JobApplication.job) cascade-delete in the Prisma
// schema, deleting the one demo User row removes every fake job, its skill
// links, and any test applications in a single query — nothing to track by
// hand, and nothing left behind.
const { PrismaClient } = require("@prisma/client");

const DEMO_EMAIL = "demo-jobs@colabconnects.internal";
const DEMO_COMPANY_NAME = "[TEST DATA] Demo Employer — not a real company";
const DEMO_COMPANY_IMAGE = "/photos/workInProgress.jpg";
const TITLE_PREFIX = "[TEST] ";
const DEMO_NOTICE =
  "⚠️ THIS IS TEST DATA — not a real job posting. It exists only to preview job listing layouts during beta testing and can be removed at any time. ⚠️\n\n";

const shortDescription =
  DEMO_NOTICE +
  "This is a short sample description used to check how compact listings render in cards and detail views.";

const mediumDescription = (body) => DEMO_NOTICE + body;

const longDescription =
  DEMO_NOTICE +
  Array.from({ length: 7 })
    .map(
      (_, i) =>
        `Paragraph ${i + 1}: This is deliberately long filler text used to stress-test how the job detail view handles lengthy descriptions — scrolling, truncation, and line wrapping. Real listings should never be this verbose, but a demo one should exercise the layout at its limits so beta testers can confirm nothing breaks or overflows awkwardly.`
    )
    .join("\n\n");

const jobs = [
  {
    title: "Investment Banking Analyst",
    location: "New York, NY",
    type: "FULL_TIME",
    remote: false,
    description: mediumDescription(
      "Support deal teams on financial modeling, valuation, and pitch materials for M&A and capital markets transactions."
    ),
    skills: ["Financial Modeling", "Valuation", "Excel", "PowerPoint", "Due Diligence"],
  },
  {
    title: "Private Equity Summer Intern",
    location: "Chicago, IL",
    type: "INTERNSHIP",
    remote: false,
    description: shortDescription,
    skills: ["Financial Modeling", "Excel", "Due Diligence"],
  },
  {
    title: "Financial Analyst",
    location: "Remote",
    type: "CONTRACT",
    remote: true,
    description: mediumDescription(
      "Short-term contract supporting monthly close, variance analysis, and ad hoc reporting for a distributed finance team."
    ),
    skills: ["Financial Reporting", "Excel"],
  },
  {
    title: "Part-Time Bookkeeping Assistant",
    location: "Austin, TX",
    type: "PART_TIME",
    remote: false,
    description: shortDescription,
    skills: [],
  },
  {
    title: "Venture Capital Associate",
    location: "San Francisco, CA",
    type: "FULL_TIME",
    remote: false,
    description: mediumDescription(
      "Evaluate early-stage investment opportunities, build market maps, and support portfolio company reporting."
    ),
    skills: [
      "Financial Modeling",
      "Market Research",
      "Valuation",
      "Excel",
      "PowerPoint",
      "Due Diligence",
      "Portfolio Management",
      "Client Relations",
    ],
  },
  {
    title: "Hedge Fund Research Intern",
    location: "Remote",
    type: "INTERNSHIP",
    remote: true,
    description: mediumDescription(
      "Assist analysts with sector research, earnings call summaries, and building screening models."
    ),
    skills: ["Financial Modeling", "Market Research", "Python", "Excel"],
  },
  {
    title: "Corporate Development Manager",
    location: "Boston, MA",
    type: "FULL_TIME",
    remote: false,
    description: shortDescription,
    skills: ["Valuation"],
  },
  {
    title: "Freelance Financial Modeling Consultant",
    location: "Remote",
    type: "CONTRACT",
    remote: true,
    description: mediumDescription(
      "Build and maintain three-statement models and scenario analyses for a portfolio of small-business clients."
    ),
    skills: [
      "Financial Modeling",
      "Excel",
      "Valuation",
      "Financial Reporting",
      "Client Relations",
      "Accounting",
    ],
  },
  {
    title:
      "Very Long Job Title To Test How The Card Handles Extended Titles That Might Wrap Across Multiple Lines In The UI",
    location: "Denver, CO",
    type: "FULL_TIME",
    remote: false,
    description: shortDescription,
    skills: ["Excel", "Financial Reporting", "Compliance"],
  },
  {
    title: "Real Assets Analyst — Infrastructure & Energy",
    location: "Houston, TX",
    type: "FULL_TIME",
    remote: false,
    description: mediumDescription(
      "Support acquisition underwriting and asset management for infrastructure and energy transition investments."
    ),
    skills: ["Financial Modeling", "Valuation", "Due Diligence", "Excel", "Market Research"],
  },
  {
    title: "Part-Time Data Entry (Finance Dept)",
    location: "Remote",
    type: "PART_TIME",
    remote: true,
    description: shortDescription,
    skills: [],
  },
  {
    title: "Credit Risk Intern",
    location: "Charlotte, NC",
    type: "INTERNSHIP",
    remote: false,
    description: shortDescription,
    skills: ["Risk Management", "Excel"],
  },
  {
    title: "Treasury Analyst",
    location: "Miami, FL",
    type: "FULL_TIME",
    remote: false,
    description: longDescription,
    skills: ["Financial Reporting", "Excel", "Accounting"],
  },
  {
    title: "Contract Compliance Reviewer",
    location: "Washington, DC",
    type: "CONTRACT",
    remote: false,
    description: mediumDescription(
      "Review client files and transaction records for regulatory compliance ahead of an upcoming audit cycle."
    ),
    skills: ["Compliance", "Risk Management", "Financial Reporting", "Excel"],
  },
  {
    title: "Wealth Management Associate",
    location: "Los Angeles, CA",
    type: "FULL_TIME",
    remote: false,
    description: mediumDescription(
      "Support financial advisors with client onboarding, portfolio reporting, and meeting preparation."
    ),
    skills: ["Client Relations", "Portfolio Management", "Excel", "PowerPoint", "Financial Reporting"],
  },
];

async function removeDemoData(prisma) {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!existing) {
    console.log("No demo company found — nothing to remove.");
    return;
  }
  // Job.company and JobApplication.job both cascade on delete, so this one
  // call removes the company, every demo job, their skill links, and any
  // applications against them.
  await prisma.user.delete({ where: { id: existing.id } });
  console.log(`Removed demo company ${DEMO_EMAIL} and all of its job listings.`);
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
          about: "Fake company created for beta-testing the job board UI. Safe to delete at any time.",
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

    console.log(`Created: ${created.title}`);
  }

  console.log(`\nDone. Seeded ${jobs.length} demo job listings under ${DEMO_EMAIL}.`);
  console.log("Run `node scripts/seed-demo-jobs.js --remove` to delete them all.");
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
