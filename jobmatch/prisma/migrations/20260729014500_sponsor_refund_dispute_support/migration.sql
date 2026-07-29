-- AlterEnum
ALTER TYPE "SponsorPaymentStatus" ADD VALUE 'DISPUTED';

-- AlterTable
ALTER TABLE "Sponsor" ADD COLUMN "stripePaymentIntentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Sponsor_stripePaymentIntentId_key" ON "Sponsor"("stripePaymentIntentId");
