-- AlterTable
ALTER TABLE "VenueSuggestionEvent" ADD COLUMN     "settledAt" TIMESTAMPTZ(3),
ADD COLUMN     "stripeInvoiceItemId" TEXT;

-- CreateIndex
CREATE INDEX "VenueSuggestionEvent_settledAt_idx" ON "VenueSuggestionEvent"("settledAt");
