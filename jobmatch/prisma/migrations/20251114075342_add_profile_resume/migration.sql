/*
  Warnings:

  - A unique constraint covering the columns `[linkedinId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Certificate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Experience` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "resumeData" TEXT;
ALTER TABLE "Profile" ADD COLUMN "resumeFileName" TEXT;
ALTER TABLE "Profile" ADD COLUMN "resumeFileType" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "linkedinId" TEXT;
ALTER TABLE "User" ADD COLUMN "linkedinUrl" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Certificate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT,
    "issuedAt" DATETIME,
    "expirationDate" DATETIME,
    "credentialId" TEXT,
    "credentialUrl" TEXT,
    "externalId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Certificate" ("credentialId", "credentialUrl", "id", "issuedAt", "issuer", "name", "userId") SELECT "credentialId", "credentialUrl", "id", "issuedAt", "issuer", "name", "userId" FROM "Certificate";
DROP TABLE "Certificate";
ALTER TABLE "new_Certificate" RENAME TO "Certificate";
CREATE INDEX "Certificate_userId_idx" ON "Certificate"("userId");
CREATE UNIQUE INDEX "Certificate_userId_externalId_key" ON "Certificate"("userId", "externalId");
CREATE TABLE "new_Experience" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "location" TEXT,
    "employmentType" TEXT,
    "description" TEXT,
    "externalId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Experience_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Experience" ("company", "description", "endDate", "id", "startDate", "title", "userId") SELECT "company", "description", "endDate", "id", "startDate", "title", "userId" FROM "Experience";
DROP TABLE "Experience";
ALTER TABLE "new_Experience" RENAME TO "Experience";
CREATE INDEX "Experience_userId_idx" ON "Experience"("userId");
CREATE UNIQUE INDEX "Experience_userId_externalId_key" ON "Experience"("userId", "externalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_linkedinId_key" ON "User"("linkedinId");
