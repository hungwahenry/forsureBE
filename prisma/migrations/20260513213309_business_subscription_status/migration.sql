-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "stripeSubscriptionStatus" TEXT,
ADD COLUMN     "stripeSubscriptionStatusAt" TIMESTAMPTZ(3);
