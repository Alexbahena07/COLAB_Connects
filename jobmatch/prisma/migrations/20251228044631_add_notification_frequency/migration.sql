-- CreateEnum
CREATE TYPE "NotificationFrequency" AS ENUM ('NONE', 'DAILY', 'WEEKLY');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notificationFrequency" "NotificationFrequency" NOT NULL DEFAULT 'WEEKLY';
