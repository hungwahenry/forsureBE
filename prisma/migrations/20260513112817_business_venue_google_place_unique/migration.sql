-- CreateIndex
CREATE UNIQUE INDEX "BusinessVenue_businessId_googlePlaceId_key" ON "BusinessVenue"("businessId", "googlePlaceId");
