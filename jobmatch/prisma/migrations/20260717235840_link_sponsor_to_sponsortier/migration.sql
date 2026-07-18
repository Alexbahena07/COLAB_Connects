/*
  Warnings:

  - Added the required column `userId` to the `Sponsor` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `tier` on the `Sponsor` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Sponsor" ADD COLUMN     "userId" TEXT NOT NULL,
DROP COLUMN "tier",
ADD COLUMN     "tier" "SponsorTier" NOT NULL;

-- DropEnum
DROP TYPE "SponsorPaymentTier";

-- CreateIndex
CREATE INDEX "Sponsor_userId_idx" ON "Sponsor"("userId");

-- AddForeignKey
ALTER TABLE "Sponsor" ADD CONSTRAINT "Sponsor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
