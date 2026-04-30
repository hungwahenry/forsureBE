-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- AlterTable: generated stored geography column derived from lat/lng
ALTER TABLE "Activity" ADD COLUMN "placePoint" geography(Point, 4326)
  GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint("placeLng", "placeLat"), 4326)::geography) STORED;

-- CreateIndex: GIST spatial index for placePoint
CREATE INDEX "Activity_placePoint_idx" ON "Activity" USING GIST ("placePoint");

-- AlterTable: generated stored geography column derived from lat/lng
ALTER TABLE "Profile" ADD COLUMN "locationPoint" geography(Point, 4326)
  GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint("locationLng", "locationLat"), 4326)::geography) STORED;

-- CreateIndex: GIST spatial index for locationPoint
CREATE INDEX "Profile_locationPoint_idx" ON "Profile" USING GIST ("locationPoint");

-- CreateTable
CREATE TABLE "ActivityParticipant" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityParticipant_userId_joinedAt_idx" ON "ActivityParticipant"("userId", "joinedAt");

-- CreateIndex
CREATE INDEX "ActivityParticipant_activityId_idx" ON "ActivityParticipant"("activityId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityParticipant_activityId_userId_key" ON "ActivityParticipant"("activityId", "userId");

-- AddForeignKey
ALTER TABLE "ActivityParticipant" ADD CONSTRAINT "ActivityParticipant_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityParticipant" ADD CONSTRAINT "ActivityParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
