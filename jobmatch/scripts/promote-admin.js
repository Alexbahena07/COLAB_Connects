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
  console.log("Usage: node scripts/promote-admin.js --email=someone@example.com");
  console.log("Options:");
  console.log("  --email=email   Email of the user to grant admin access to");
  console.log("  --revoke        Revoke admin access instead of granting it");
  console.log("  --help          Show this help message");
};

const main = async () => {
  if (hasFlag("help")) {
    printUsage();
    return;
  }

  const email = getArg("email")?.trim().toLowerCase();
  if (!email) {
    printUsage();
    throw new Error("Missing --email=<email>");
  }

  const isAdmin = !hasFlag("revoke");

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, isAdmin: true },
  });

  if (!user) {
    throw new Error(`No user found with email ${email}`);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { isAdmin },
    select: { id: true, email: true, isAdmin: true },
  });

  console.log(
    `${updated.email} is now ${updated.isAdmin ? "an admin" : "no longer an admin"}.`
  );
};

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
