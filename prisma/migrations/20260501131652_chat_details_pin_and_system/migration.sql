-- CreateEnum
CREATE TYPE "ChatMessageKind" AS ENUM ('TEXT', 'SYSTEM');

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN "pinnedMessageId" TEXT;

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN "kind" "ChatMessageKind" NOT NULL DEFAULT 'TEXT';

-- CreateIndex
CREATE UNIQUE INDEX "Activity_pinnedMessageId_key" ON "Activity"("pinnedMessageId");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_pinnedMessageId_fkey" FOREIGN KEY ("pinnedMessageId") REFERENCES "ChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
