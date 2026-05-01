-- CreateEnum
CREATE TYPE "PostVisibility" AS ENUM ('PARTICIPANTS', 'PUBLIC');

-- AlterEnum
ALTER TYPE "ReportTargetType" ADD VALUE 'POST';

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN "memoriesShareablePublicly" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ActivityPost" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "caption" TEXT,
    "visibility" "PostVisibility" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ActivityPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityPostPhoto" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "imageKey" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityPostPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityPost_activityId_createdAt_idx" ON "ActivityPost"("activityId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityPost_visibility_createdAt_idx" ON "ActivityPost"("visibility", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityPost_authorId_createdAt_idx" ON "ActivityPost"("authorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityPost_activityId_authorId_key" ON "ActivityPost"("activityId", "authorId");

-- CreateIndex
CREATE INDEX "ActivityPostPhoto_postId_sortOrder_idx" ON "ActivityPostPhoto"("postId", "sortOrder");

-- AddForeignKey
ALTER TABLE "ActivityPost" ADD CONSTRAINT "ActivityPost_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityPost" ADD CONSTRAINT "ActivityPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityPostPhoto" ADD CONSTRAINT "ActivityPostPhoto_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ActivityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
