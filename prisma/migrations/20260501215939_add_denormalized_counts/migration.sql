-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "messageCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "postCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "activitiesCompletedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "memoriesPostedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "messagesSentCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "photosSharedCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "UserYearStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "activitiesHostedCount" INTEGER NOT NULL DEFAULT 0,
    "activitiesJoinedCount" INTEGER NOT NULL DEFAULT 0,
    "activitiesCompletedCount" INTEGER NOT NULL DEFAULT 0,
    "activitiesCancelledCount" INTEGER NOT NULL DEFAULT 0,
    "messagesSentCount" INTEGER NOT NULL DEFAULT 0,
    "memoriesPostedCount" INTEGER NOT NULL DEFAULT 0,
    "photosSharedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "UserYearStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserYearStats_userId_idx" ON "UserYearStats"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserYearStats_userId_year_key" ON "UserYearStats"("userId", "year");

-- AddForeignKey
ALTER TABLE "UserYearStats" ADD CONSTRAINT "UserYearStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
