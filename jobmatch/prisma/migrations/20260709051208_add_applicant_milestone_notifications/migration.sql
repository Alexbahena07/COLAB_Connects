-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'APPLICANT_MILESTONE';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "milestoneCount" INTEGER;
