-- CreateTable
CREATE TABLE "ContactLead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "message" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactLead_createdAt_idx" ON "ContactLead"("createdAt");

-- Seed the admin-tunable inbox for contact-form notifications.
INSERT INTO "AppConfig" ("key","value","defaultValue","valueType","minValue","maxValue","category","label","description","updatedAt") VALUES
('contact.notification_email','""','""','STRING',NULL,NULL,'Contact','Contact form notification inbox','Email that receives marketing-site contact-form submissions. Leave blank to disable notification emails — leads are still stored.',NOW());
