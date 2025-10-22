/*
  Warnings:

  - You are about to drop the column `fullName` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `level` on the `UserSkill` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "headline" TEXT,
    "desiredLocation" TEXT,
    CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Profile" ("headline", "id", "userId") SELECT "headline", "id", "userId" FROM "Profile";
DROP TABLE "Profile";
ALTER TABLE "new_Profile" RENAME TO "Profile";
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");
CREATE TABLE "new_UserSkill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "years" INTEGER,
    CONSTRAINT "UserSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UserSkill" ("id", "skillId", "userId", "years") SELECT "id", "skillId", "userId", "years" FROM "UserSkill";
DROP TABLE "UserSkill";
ALTER TABLE "new_UserSkill" RENAME TO "UserSkill";
CREATE INDEX "UserSkill_userId_idx" ON "UserSkill"("userId");
CREATE UNIQUE INDEX "UserSkill_userId_skillId_key" ON "UserSkill"("userId", "skillId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
