-- AlterTable
ALTER TABLE "AdminPage" ADD COLUMN     "footerOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "showInFooter" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "AdminPage_showInFooter_footerOrder_idx" ON "AdminPage"("showInFooter", "footerOrder");
