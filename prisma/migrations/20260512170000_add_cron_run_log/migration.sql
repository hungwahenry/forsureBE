-- CreateTable
CREATE TABLE "CronRunLog" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMPTZ(3),
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "durationMs" INTEGER,
    "errorMessage" TEXT,
    "errorStack" TEXT,
    "result" JSONB,

    CONSTRAINT "CronRunLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CronRunLog_jobName_startedAt_idx" ON "CronRunLog"("jobName", "startedAt");

-- CreateIndex
CREATE INDEX "CronRunLog_startedAt_idx" ON "CronRunLog"("startedAt");

-- CreateIndex
CREATE INDEX "CronRunLog_status_startedAt_idx" ON "CronRunLog"("status", "startedAt");
