-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activatedAt" TIMESTAMP(3);

-- Backfill: for accounts that already have a password, registration is the
-- only point one could have been set so far (the reset-password flow didn't
-- stamp activatedAt before this migration) — createdAt is the correct value.
-- Accounts with no password (e.g. not-yet-claimed bulk imports) stay null.
UPDATE "User" SET "activatedAt" = "createdAt" WHERE "password" IS NOT NULL;
