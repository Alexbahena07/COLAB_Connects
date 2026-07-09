-- CreateTable
CREATE TABLE "CompanyEventPost" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "about" TEXT NOT NULL,
    "link" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyEventPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyEventPost_companyId_idx" ON "CompanyEventPost"("companyId");

-- CreateIndex
CREATE INDEX "CompanyEventPost_createdAt_idx" ON "CompanyEventPost"("createdAt");

-- AddForeignKey
ALTER TABLE "CompanyEventPost" ADD CONSTRAINT "CompanyEventPost_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
