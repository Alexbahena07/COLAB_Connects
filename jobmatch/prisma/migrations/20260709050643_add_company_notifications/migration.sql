-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'SPONSOR_TIER_UPGRADED';
ALTER TYPE "NotificationType" ADD VALUE 'COMPANY_APPROVED';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "sponsorTier" "SponsorTier";
