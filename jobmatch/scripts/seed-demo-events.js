// Seeds 15 fake event posts for beta testers to preview the "Events" side of
// the opportunities board against varied data (with/without an image,
// with/without a link button, short vs. long descriptions). Every post lives
// under a single, clearly-labeled demo company account, so cleanup is one
// command:
//
//   node scripts/seed-demo-events.js            create/reset the demo events
//   node scripts/seed-demo-events.js --remove   delete the demo company + all its events
//
// This is a separate demo company from scripts/seed-demo-jobs.js on purpose:
// each script's reset step deletes and recreates its own company, and
// sharing one account between them would let running one script silently
// wipe out the other's data. CompanyEventPost.company cascade-deletes, so
// deleting the one demo User row here removes every fake event with it.
const { PrismaClient } = require("@prisma/client");

const DEMO_EMAIL = "demo-events@colabconnects.internal";
const DEMO_COMPANY_NAME = "[TEST DATA] Demo Events Company — not a real company";
const DEMO_COMPANY_IMAGE = "/photos/test/testIcon.JPEG";
const TITLE_PREFIX = "[TEST] ";
const DEMO_NOTICE =
  "⚠️ THIS IS TEST DATA — not a real event. It exists only to preview event card layouts during beta testing and can be removed at any time. ⚠️\n\n";

const shortAbout =
  DEMO_NOTICE + "Short sample description used to check how compact event cards render.";

const mediumAbout = (body) => DEMO_NOTICE + body;

const longAbout =
  DEMO_NOTICE +
  Array.from({ length: 6 })
    .map(
      (_, i) =>
        `Paragraph ${i + 1}: This is deliberately long filler text used to stress-test how the event detail view handles lengthy descriptions — scrolling, truncation, and line wrapping. A real event post should never be this verbose, but a demo one should exercise the layout at its limits.`
    )
    .join("\n\n");

const events = [
  {
    title: "Fall Networking Mixer",
    about: mediumAbout("Meet recruiters and alumni from sponsor firms over light refreshments."),
    link: "https://colabconnects.org",
    linkLabel: "RSVP",
    imageUrl: DEMO_COMPANY_IMAGE,
  },
  {
    title: "Resume Workshop for First-Gen Students",
    about: shortAbout,
    link: null,
    linkLabel: null,
    imageUrl: null,
  },
  {
    title: "Women in Finance Panel",
    about: mediumAbout("Hear from senior women in asset management, PE, and venture capital."),
    link: "https://colabconnects.org",
    linkLabel: "Register Here",
    imageUrl: DEMO_COMPANY_IMAGE,
  },
  {
    title: "Mock Interview Day",
    about: shortAbout,
    link: null,
    linkLabel: null,
    imageUrl: null,
  },
  {
    title: "Alumni Speaker Series: Careers in Private Equity",
    about: mediumAbout("A COLAB alum walks through their path from analyst to associate."),
    link: "https://colabconnects.org",
    linkLabel: "Learn More",
    imageUrl: null,
  },
  {
    title: "LinkedIn Headshot Pop-Up",
    about: shortAbout,
    link: null,
    linkLabel: null,
    imageUrl: DEMO_COMPANY_IMAGE,
  },
  {
    title: "Case Study Competition Kickoff",
    about: mediumAbout("Teams of four tackle a real-world valuation case over two weeks."),
    link: "https://colabconnects.org",
    linkLabel: "Sign Up",
    imageUrl: null,
  },
  {
    title: "Employer Office Hours — Q&A",
    about: shortAbout,
    link: null,
    linkLabel: null,
    imageUrl: null,
  },
  {
    title:
      "Very Long Event Title To Test How The Card Handles Extended Titles That Might Wrap Across Multiple Lines In The UI",
    about: shortAbout,
    link: null,
    linkLabel: null,
    imageUrl: DEMO_COMPANY_IMAGE,
  },
  {
    title: "Virtual Info Session: Summer Internships",
    about: mediumAbout("An overview of internship tracks open for the upcoming summer cohort."),
    link: "https://colabconnects.org",
    linkLabel: "Join Virtually",
    imageUrl: null,
  },
  {
    title: "Trading Floor Tour (In-Person)",
    about: shortAbout,
    link: null,
    linkLabel: null,
    imageUrl: DEMO_COMPANY_IMAGE,
  },
  {
    title: "Excel & Financial Modeling Bootcamp",
    about: longAbout,
    link: "https://colabconnects.org",
    linkLabel: "Reserve a Spot",
    imageUrl: DEMO_COMPANY_IMAGE,
  },
  {
    title: "Diversity in Finance Roundtable",
    about: mediumAbout("An open discussion on building more inclusive pipelines into finance."),
    link: null,
    linkLabel: null,
    imageUrl: null,
  },
  {
    title: "Career Fair Prep Session",
    about: shortAbout,
    link: null,
    linkLabel: null,
    imageUrl: null,
  },
  {
    title: "Year-End Recap & Networking Social",
    about: mediumAbout("Close out the year with fellow candidates and sponsor company reps."),
    link: "https://colabconnects.org",
    linkLabel: "RSVP",
    imageUrl: DEMO_COMPANY_IMAGE,
  },
];

async function removeDemoData(prisma) {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!existing) {
    console.log("No demo events company found — nothing to remove.");
    return;
  }
  // CompanyEventPost.company cascades on delete, so this one call removes
  // the company and every demo event post with it.
  await prisma.user.delete({ where: { id: existing.id } });
  console.log(`Removed demo events company ${DEMO_EMAIL} and all of its event posts.`);
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
          about: "Fake company created for beta-testing the events feed. Safe to delete at any time.",
          approvalStatus: "APPROVED",
        },
      },
    },
  });

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
    console.log(`Created: ${created.title}`);
  }

  console.log(`\nDone. Seeded ${events.length} demo event posts under ${DEMO_EMAIL}.`);
  console.log("Run `node scripts/seed-demo-events.js --remove` to delete them all.");
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
