-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "businessVenueId" TEXT;

-- CreateIndex
CREATE INDEX "Activity_businessVenueId_idx" ON "Activity"("businessVenueId");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_businessVenueId_fkey" FOREIGN KEY ("businessVenueId") REFERENCES "BusinessVenue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
