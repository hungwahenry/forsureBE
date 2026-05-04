-- CreateTable
CREATE TABLE "EasterEggDiscovery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eggCode" TEXT NOT NULL,
    "discoveredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EasterEggDiscovery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EasterEggDiscovery_userId_eggCode_key" ON "EasterEggDiscovery"("userId", "eggCode");

-- CreateIndex
CREATE INDEX "EasterEggDiscovery_eggCode_discoveredAt_idx" ON "EasterEggDiscovery"("eggCode", "discoveredAt");

-- AddForeignKey
ALTER TABLE "EasterEggDiscovery" ADD CONSTRAINT "EasterEggDiscovery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
