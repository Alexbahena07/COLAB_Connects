/* eslint-disable no-console */
// One-off backfill: User.createdAt didn't exist before the admin-dashboard migration,
// so every pre-existing row was stamped with the migration's @default(now()) — i.e. the
// migration timestamp, not the real signup date. Prisma's default cuid() embeds a
// millisecond timestamp in the first 8 chars after the leading "c", so we recover the
// real creation time from each user's id instead.
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function decodeCuidTimestamp(id) {
  if (typeof id !== "string" || id.length !== 25 || id[0] !== "c") return null;
  const tsPart = id.slice(1, 9);
  const ms = parseInt(tsPart, 36);
  if (!Number.isFinite(ms)) return null;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

const hasFlag = (name) => process.argv.includes(`--${name}`);

async function main() {
  const dryRun = hasFlag("dry-run");
  const users = await prisma.user.findMany({ select: { id: true, email: true, createdAt: true } });

  let updated = 0;
  let skipped = 0;

  for (const user of users) {
    const decoded = decodeCuidTimestamp(user.id);
    if (!decoded) {
      skipped += 1;
      console.log(`SKIP (undecodable id): ${user.id} (${user.email})`);
      continue;
    }

    if (decoded.getTime() === user.createdAt.getTime()) {
      continue; // already accurate, no-op
    }

    console.log(
      `${dryRun ? "[dry-run] " : ""}${user.email ?? user.id}: ${user.createdAt.toISOString()} -> ${decoded.toISOString()}`
    );

    if (!dryRun) {
      await prisma.user.update({ where: { id: user.id }, data: { createdAt: decoded } });
    }
    updated += 1;
  }

  console.log(`\n${dryRun ? "Would update" : "Updated"} ${updated} user(s). Skipped ${skipped}.`);
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
