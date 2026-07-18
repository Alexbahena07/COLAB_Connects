-- CreateEnum
CREATE TYPE "SponsorPaymentTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD');

-- CreateEnum
CREATE TYPE "SponsorPaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateTable
CREATE TABLE "Sponsor" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "tier" "SponsorPaymentTier" NOT NULL,
    "stripeSessionId" TEXT NOT NULL,
    "amountPaid" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "SponsorPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sponsor_stripeSessionId_key" ON "Sponsor"("stripeSessionId");

-- CreateIndex
CREATE INDEX "Sponsor_email_idx" ON "Sponsor"("email");

-- CreateIndex
CREATE INDEX "Sponsor_status_idx" ON "Sponsor"("status");
