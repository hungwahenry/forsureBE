-- AlterTable: add 100ms room ID to Activity
ALTER TABLE "Activity" ADD COLUMN "hmsRoomId" TEXT;
