-- AlterTable: add nullable groupKey column to Notification
ALTER TABLE "Notification" ADD COLUMN "groupKey" TEXT;

-- CreateIndex: unique on (userId, groupKey) — PostgreSQL treats NULL as
-- distinct so multiple rows with groupKey IS NULL are allowed; only rows
-- with the same non-null groupKey+userId are constrained.
CREATE UNIQUE INDEX "Notification_userId_groupKey_key" ON "Notification"("userId", "groupKey");
