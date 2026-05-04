-- CreateTable
CREATE TABLE "StepUpChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StepUpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StepUpChallenge_userId_action_consumedAt_idx" ON "StepUpChallenge"("userId", "action", "consumedAt");

-- AddForeignKey
ALTER TABLE "StepUpChallenge" ADD CONSTRAINT "StepUpChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
