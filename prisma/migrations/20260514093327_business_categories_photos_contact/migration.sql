-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "coverPhotoKey" TEXT,
ADD COLUMN     "shortDescription" TEXT,
ADD COLUMN     "supportEmail" TEXT,
ADD COLUMN     "supportPhone" TEXT;

-- AlterTable
ALTER TABLE "BusinessVenue" ADD COLUMN     "openingHours" JSONB,
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "websiteUrl" TEXT;

-- CreateTable
CREATE TABLE "BusinessCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "iconName" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessVenuePhoto" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "imageKey" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessVenuePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessCategory_code_key" ON "BusinessCategory"("code");

-- CreateIndex
CREATE INDEX "BusinessCategory_active_sortOrder_idx" ON "BusinessCategory"("active", "sortOrder");

-- CreateIndex
CREATE INDEX "BusinessVenuePhoto_venueId_sortOrder_idx" ON "BusinessVenuePhoto"("venueId", "sortOrder");

-- CreateIndex
CREATE INDEX "Business_categoryId_idx" ON "Business"("categoryId");

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BusinessCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessVenuePhoto" ADD CONSTRAINT "BusinessVenuePhoto_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "BusinessVenue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
