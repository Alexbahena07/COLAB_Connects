-- CreateEnum
CREATE TYPE "JobApplicationStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'INTERVIEWING', 'OFFERED', 'HIRED', 'REJECTED');

-- AlterTable: convert JobApplication.status from free-form text to the new
-- enum. Every existing row is literally 'SUBMITTED', which casts cleanly —
-- no data loss, unlike a naive drop/recreate.
ALTER TABLE "JobApplication" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "JobApplication" ALTER COLUMN "status" TYPE "JobApplicationStatus" USING ("status"::"JobApplicationStatus");
ALTER TABLE "JobApplication" ALTER COLUMN "status" SET DEFAULT 'SUBMITTED';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'APPLICATION_STATUS_CHANGED';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "applicationStatus" "JobApplicationStatus";
