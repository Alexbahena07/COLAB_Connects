/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const getArg = (name) => {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
};

const hasFlag = (name) => process.argv.includes(`--${name}`);

const printUsage = () => {
  console.log("Usage: node scripts/seed-job-post-event.js [options]");
  console.log("Options:");
  console.log("  --user=email        Use a specific user email");
  console.log("  --job=id            Use a specific job id");
  console.log("  --frequency=DAILY   Set notification frequency (DAILY or WEEKLY)");
  console.log("  --no-update         Do not update user frequency if it's NONE");
  console.log("  --help              Show this help message");
};

const normalizeFrequency = (value) => {
  if (value === "DAILY" || value === "WEEKLY") return value;
  return "DAILY";
};

const main = async () => {
  if (hasFlag("help")) {
    printUsage();
    return;
  }

  const userEmail = getArg("user");
  const jobId = getArg("job");
  const frequency = normalizeFrequency(getArg("frequency"));
  const preventUpdate = hasFlag("no-update");

  const user = userEmail
    ? await prisma.user.findUnique({
        where: { email: userEmail },
        select: { id: true, email: true, notificationFrequency: true },
      })
    : await prisma.user.findFirst({
        where: { email: { not: null } },
        select: { id: true, email: true, notificationFrequency: true },
        orderBy: { email: "asc" },
      });

  if (!user) {
    throw new Error("No user with an email found. Create a user first.");
  }

  if (user.notificationFrequency === "NONE") {
    if (preventUpdate) {
      throw new Error(
        `User ${user.email} has notifications disabled. Re-run without --no-update to enable.`
      );
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { notificationFrequency: frequency },
    });
    console.log(`Updated ${user.email} frequency to ${frequency}.`);
  }

  const job = jobId
    ? await prisma.job.findUnique({
        where: { id: jobId },
        select: { id: true, title: true, companyId: true },
      })
    : await prisma.job.findFirst({
        select: { id: true, title: true, companyId: true },
        orderBy: { postedAt: "desc" },
      });

  if (!job) {
    throw new Error("No jobs found. Create a job posting first.");
  }

  const event = await prisma.jobPostEvent.create({
    data: {
      userId: user.id,
      companyId: job.companyId,
      jobId: job.id,
      jobTitle: job.title,
    },
  });

  console.log("Created JobPostEvent:", {
    id: event.id,
    userEmail: user.email,
    jobId: job.id,
    jobTitle: job.title,
  });
};

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
