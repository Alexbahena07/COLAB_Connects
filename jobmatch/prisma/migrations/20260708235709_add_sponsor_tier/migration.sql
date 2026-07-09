-- CreateEnum
CREATE TYPE "SponsorTier" AS ENUM ('FREE', 'SILVER', 'GOLD', 'PLATINUM');

-- AlterTable
ALTER TABLE "CompanyProfile" ADD COLUMN     "sponsorTier" "SponsorTier" NOT NULL DEFAULT 'FREE';

-- CreateIndex
CREATE INDEX "CompanyProfile_sponsorTier_idx" ON "CompanyProfile"("sponsorTier");
