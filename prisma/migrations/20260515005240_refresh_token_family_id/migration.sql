-- AlterTable: add familyId nullable first so we can backfill safely.
ALTER TABLE "RefreshToken" ADD COLUMN "familyId" TEXT;

-- Backfill: existing tokens become their own family.
UPDATE "RefreshToken" SET "familyId" = "id" WHERE "familyId" IS NULL;

-- Enforce NOT NULL after backfill.
ALTER TABLE "RefreshToken" ALTER COLUMN "familyId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");
