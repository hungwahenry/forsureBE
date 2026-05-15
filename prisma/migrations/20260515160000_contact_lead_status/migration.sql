-- AlterTable
ALTER TABLE "ContactLead" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'NEW';

-- Reindex for status-filtered listing.
DROP INDEX "ContactLead_createdAt_idx";
CREATE INDEX "ContactLead_status_createdAt_idx" ON "ContactLead"("status", "createdAt");
