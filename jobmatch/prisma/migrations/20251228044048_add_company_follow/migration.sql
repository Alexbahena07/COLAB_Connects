-- CreateTable
CREATE TABLE "CompanyFollow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyFollow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyFollow_companyId_idx" ON "CompanyFollow"("companyId");

-- CreateIndex
CREATE INDEX "CompanyFollow_userId_idx" ON "CompanyFollow"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyFollow_userId_companyId_key" ON "CompanyFollow"("userId", "companyId");

-- AddForeignKey
ALTER TABLE "CompanyFollow" ADD CONSTRAINT "CompanyFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyFollow" ADD CONSTRAINT "CompanyFollow_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
