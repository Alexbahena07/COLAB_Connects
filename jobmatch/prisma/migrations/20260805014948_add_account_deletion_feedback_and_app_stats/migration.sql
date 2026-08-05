-- CreateEnum
CREATE TYPE "AccountDeletionReason" AS ENUM ('FOUND_A_JOB', 'NOT_USEFUL', 'TOO_MANY_EMAILS', 'PRIVACY_CONCERNS', 'DIFFICULT_TO_USE', 'CREATING_ANOTHER_ACCOUNT', 'OTHER');

-- CreateTable
CREATE TABLE "AccountDeletionFeedback" (
    "id" TEXT NOT NULL,
    "reason" "AccountDeletionReason" NOT NULL,
    "otherReason" TEXT,
    "accountType" "AccountType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountDeletionFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppStats" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "totalUsersCreated" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountDeletionFeedback_reason_idx" ON "AccountDeletionFeedback"("reason");

-- Seed the lifetime counter from today's existing user count, so it reflects
-- real history instead of starting at 0 on deploy.
INSERT INTO "AppStats" ("id", "totalUsersCreated", "updatedAt")
SELECT 'singleton', COUNT(*), CURRENT_TIMESTAMP FROM "User"
ON CONFLICT ("id") DO NOTHING;
