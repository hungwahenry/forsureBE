-- CreateTable
CREATE TABLE "ActivityBoost" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "radiusM" INTEGER NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "chargedCents" INTEGER NOT NULL DEFAULT 0,
    "isOverage" BOOLEAN NOT NULL DEFAULT false,
    "stripeInvoiceItemId" TEXT,
    "cancelledAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ActivityBoost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActivityBoost_stripeInvoiceItemId_key" ON "ActivityBoost"("stripeInvoiceItemId");

-- CreateIndex
CREATE INDEX "ActivityBoost_activityId_endsAt_idx" ON "ActivityBoost"("activityId", "endsAt");

-- CreateIndex
CREATE INDEX "ActivityBoost_businessId_createdAt_idx" ON "ActivityBoost"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityBoost_endsAt_idx" ON "ActivityBoost"("endsAt");

-- AddForeignKey
ALTER TABLE "ActivityBoost" ADD CONSTRAINT "ActivityBoost_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityBoost" ADD CONSTRAINT "ActivityBoost_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
