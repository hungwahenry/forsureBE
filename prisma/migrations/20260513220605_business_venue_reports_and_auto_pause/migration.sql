-- AlterEnum
ALTER TYPE "ReportTargetType" ADD VALUE 'BUSINESS_VENUE';

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "autoPausedAt" TIMESTAMPTZ(3);
