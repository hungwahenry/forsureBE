-- AlterTable
ALTER TABLE "AppConfig" ADD COLUMN "clientExposed" BOOLEAN NOT NULL DEFAULT false;

-- Expose the keys that clients mirror for pre-flight validation.
UPDATE "AppConfig" SET "clientExposed" = true
WHERE "key" IN (
  'activity.min_lead_time_minutes',
  'onboarding.min_age_years',
  'venue.photo_max'
);
