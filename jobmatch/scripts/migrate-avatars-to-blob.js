// One-off backfill: moves any User.image values still stored as base64 data
// URLs into Vercel Blob storage, replacing the column with just the URL.
// Run with: node scripts/migrate-avatars-to-blob.js
const { PrismaClient } = require("@prisma/client");
const { put } = require("@vercel/blob");
const { randomUUID } = require("crypto");

const EXTENSION_BY_TYPE = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function parseImageDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const [, contentType, base64] = match;
  if (!EXTENSION_BY_TYPE[contentType]) return null;
  return { buffer: Buffer.from(base64, "base64"), contentType };
}

async function main() {
  const avatarToken = process.env.AVATAR_BLOB_READ_WRITE_TOKEN;
  if (!avatarToken) throw new Error("AVATAR_BLOB_READ_WRITE_TOKEN is not set");

  const prisma = new PrismaClient();
  const users = await prisma.user.findMany({
    where: { image: { startsWith: "data:image" } },
    select: { id: true, image: true },
  });

  console.log(`Found ${users.length} user(s) with base64 avatars.`);

  let migrated = 0;
  let failed = 0;

  for (const user of users) {
    const parsed = parseImageDataUrl(user.image);
    if (!parsed) {
      console.error(`Skipping ${user.id}: unrecognized data URL format`);
      failed += 1;
      continue;
    }

    try {
      const extension = EXTENSION_BY_TYPE[parsed.contentType];
      const blob = await put(`avatars/${user.id}-${randomUUID()}.${extension}`, parsed.buffer, {
        access: "public",
        contentType: parsed.contentType,
        token: avatarToken,
      });
      await prisma.user.update({ where: { id: user.id }, data: { image: blob.url } });
      console.log(`Migrated ${user.id} -> ${blob.url}`);
      migrated += 1;
    } catch (error) {
      console.error(`Failed to migrate ${user.id}:`, error.message);
      failed += 1;
    }
  }

  console.log(`Done. Migrated ${migrated}, failed ${failed}.`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
