-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'NEW_EVENT';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "eventPostId" TEXT,
ADD COLUMN     "eventTitle" TEXT;

-- CreateIndex
CREATE INDEX "Notification_eventPostId_idx" ON "Notification"("eventPostId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_eventPostId_fkey" FOREIGN KEY ("eventPostId") REFERENCES "CompanyEventPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
