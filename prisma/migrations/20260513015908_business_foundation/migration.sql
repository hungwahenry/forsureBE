-- CreateEnum
CREATE TYPE "BusinessMemberRole" AS ENUM ('OWNER', 'MANAGER');

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoKey" TEXT,
    "verifiedAt" TIMESTAMPTZ(3),
    "suspendedAt" TIMESTAMPTZ(3),
    "suspendedById" TEXT,
    "suspendedReason" TEXT,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessMember" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "BusinessMemberRole" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessVenue" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "placeName" TEXT NOT NULL,
    "placeLat" DOUBLE PRECISION NOT NULL,
    "placeLng" DOUBLE PRECISION NOT NULL,
    "placePoint" geography(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint("placeLng", "placeLat"), 4326)::geography) STORED,
    "googlePlaceId" TEXT,
    "matchingKeywords" TEXT[],
    "maxRadiusM" INTEGER NOT NULL DEFAULT 5000,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "dailyBudgetCents" INTEGER NOT NULL DEFAULT 0,
    "dailyBudgetRemaining" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BusinessVenue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenueSuggestionEvent" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "activityId" TEXT,
    "chargedCents" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VenueSuggestionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Business_slug_key" ON "Business"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Business_stripeCustomerId_key" ON "Business"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Business_stripeSubscriptionId_key" ON "Business"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "BusinessMember_userId_idx" ON "BusinessMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessMember_businessId_userId_key" ON "BusinessMember"("businessId", "userId");

-- CreateIndex
CREATE INDEX "BusinessVenue_businessId_idx" ON "BusinessVenue"("businessId");

-- CreateIndex (GIST spatial index for venue suggestion radius queries)
CREATE INDEX "BusinessVenue_placePoint_idx" ON "BusinessVenue" USING GIST ("placePoint");

-- CreateIndex
CREATE INDEX "VenueSuggestionEvent_venueId_createdAt_idx" ON "VenueSuggestionEvent"("venueId", "createdAt");

-- CreateIndex
CREATE INDEX "VenueSuggestionEvent_userId_venueId_createdAt_idx" ON "VenueSuggestionEvent"("userId", "venueId", "createdAt");

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_suspendedById_fkey" FOREIGN KEY ("suspendedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessMember" ADD CONSTRAINT "BusinessMember_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessMember" ADD CONSTRAINT "BusinessMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessVenue" ADD CONSTRAINT "BusinessVenue_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueSuggestionEvent" ADD CONSTRAINT "VenueSuggestionEvent_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "BusinessVenue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueSuggestionEvent" ADD CONSTRAINT "VenueSuggestionEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueSuggestionEvent" ADD CONSTRAINT "VenueSuggestionEvent_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
