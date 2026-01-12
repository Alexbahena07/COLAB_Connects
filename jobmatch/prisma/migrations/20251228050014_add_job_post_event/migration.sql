-- CreateTable
CREATE TABLE "JobPostEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobPostEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobPostEvent_userId_idx" ON "JobPostEvent"("userId");

-- CreateIndex
CREATE INDEX "JobPostEvent_companyId_idx" ON "JobPostEvent"("companyId");

-- CreateIndex
CREATE INDEX "JobPostEvent_jobId_idx" ON "JobPostEvent"("jobId");

-- AddForeignKey
ALTER TABLE "JobPostEvent" ADD CONSTRAINT "JobPostEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPostEvent" ADD CONSTRAINT "JobPostEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPostEvent" ADD CONSTRAINT "JobPostEvent_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
