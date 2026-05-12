-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');

-- AlterTable: User — role + suspension metadata
ALTER TABLE "User"
  ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER',
  ADD COLUMN "suspendedAt" TIMESTAMPTZ(3),
  ADD COLUMN "suspendedUntil" TIMESTAMPTZ(3),
  ADD COLUMN "suspendedReason" TEXT,
  ADD COLUMN "suspendedById" TEXT;

ALTER TABLE "User"
  ADD CONSTRAINT "User_suspendedById_fkey"
  FOREIGN KEY ("suspendedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: Activity — soft-delete fields
ALTER TABLE "Activity"
  ADD COLUMN "deletedAt" TIMESTAMPTZ(3),
  ADD COLUMN "deletedById" TEXT,
  ADD COLUMN "deletedReason" TEXT;

ALTER TABLE "Activity"
  ADD CONSTRAINT "Activity_deletedById_fkey"
  FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: ChatMessage — soft-delete fields
ALTER TABLE "ChatMessage"
  ADD COLUMN "deletedAt" TIMESTAMPTZ(3),
  ADD COLUMN "deletedById" TEXT,
  ADD COLUMN "deletedReason" TEXT;

ALTER TABLE "ChatMessage"
  ADD CONSTRAINT "ChatMessage_deletedById_fkey"
  FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: ActivityPost — soft-delete fields
ALTER TABLE "ActivityPost"
  ADD COLUMN "deletedAt" TIMESTAMPTZ(3),
  ADD COLUMN "deletedById" TEXT,
  ADD COLUMN "deletedReason" TEXT;

ALTER TABLE "ActivityPost"
  ADD CONSTRAINT "ActivityPost_deletedById_fkey"
  FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: AdminAuditLog
CREATE TABLE "AdminAuditLog" (
  "id"         TEXT NOT NULL,
  "adminId"    TEXT NOT NULL,
  "action"     TEXT NOT NULL,
  "targetType" TEXT,
  "targetId"   TEXT,
  "before"     JSONB,
  "after"      JSONB,
  "reason"     TEXT,
  "ipAddress"  TEXT,
  "userAgent"  TEXT,
  "createdAt"  TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminAuditLog_adminId_createdAt_idx" ON "AdminAuditLog"("adminId", "createdAt");
CREATE INDEX "AdminAuditLog_targetType_targetId_idx" ON "AdminAuditLog"("targetType", "targetId");
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

ALTER TABLE "AdminAuditLog"
  ADD CONSTRAINT "AdminAuditLog_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: FeatureFlag
CREATE TABLE "FeatureFlag" (
  "key"         TEXT NOT NULL,
  "enabled"     BOOLEAN NOT NULL DEFAULT false,
  "description" TEXT,
  "updatedById" TEXT,
  "createdAt"   TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("key")
);

ALTER TABLE "FeatureFlag"
  ADD CONSTRAINT "FeatureFlag_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
