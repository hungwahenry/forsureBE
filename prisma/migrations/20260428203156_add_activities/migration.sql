-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('OPEN', 'FULL', 'CANCELLED', 'DONE');

-- CreateEnum
CREATE TYPE "ActivityGenderPreference" AS ENUM ('ALL', 'MALE', 'FEMALE');

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "placeName" TEXT NOT NULL,
    "placeLat" DOUBLE PRECISION NOT NULL,
    "placeLng" DOUBLE PRECISION NOT NULL,
    "capacity" INTEGER NOT NULL,
    "genderPreference" "ActivityGenderPreference" NOT NULL,
    "status" "ActivityStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Activity_startsAt_idx" ON "Activity"("startsAt");

-- CreateIndex
CREATE INDEX "Activity_status_startsAt_idx" ON "Activity"("status", "startsAt");

-- CreateIndex
CREATE INDEX "Activity_authorUserId_createdAt_idx" ON "Activity"("authorUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
