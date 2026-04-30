-- AlterTable: denormalized counter columns (maintained by triggers below).
ALTER TABLE "Activity" ADD COLUMN "participantCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Profile"
  ADD COLUMN "activitiesHostedCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "activitiesJoinedCount" INTEGER NOT NULL DEFAULT 0;

-- Backfill from existing rows.
UPDATE "Activity" a
  SET "participantCount" = (
    SELECT COUNT(*) FROM "ActivityParticipant" p WHERE p."activityId" = a.id
  );

UPDATE "Profile" p
  SET "activitiesHostedCount" = (
    SELECT COUNT(*) FROM "Activity" a WHERE a."authorUserId" = p."userId"
  );

UPDATE "Profile" p
  SET "activitiesJoinedCount" = (
    SELECT COUNT(*) FROM "ActivityParticipant" ap WHERE ap."userId" = p."userId"
  );

-- Trigger: keep Activity.participantCount + Profile.activitiesJoinedCount in sync
-- with ActivityParticipant rows. Fires on INSERT (++) and DELETE (--), including
-- cascaded deletes when an Activity or User row is removed.
CREATE OR REPLACE FUNCTION sync_activity_participant_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE "Activity" SET "participantCount" = "participantCount" + 1
      WHERE id = NEW."activityId";
    UPDATE "Profile" SET "activitiesJoinedCount" = "activitiesJoinedCount" + 1
      WHERE "userId" = NEW."userId";
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE "Activity" SET "participantCount" = "participantCount" - 1
      WHERE id = OLD."activityId";
    UPDATE "Profile" SET "activitiesJoinedCount" = "activitiesJoinedCount" - 1
      WHERE "userId" = OLD."userId";
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER activity_participant_counts
AFTER INSERT OR DELETE ON "ActivityParticipant"
FOR EACH ROW
EXECUTE FUNCTION sync_activity_participant_counts();

-- Trigger: keep Profile.activitiesHostedCount in sync with Activity rows.
CREATE OR REPLACE FUNCTION sync_activity_hosted_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE "Profile" SET "activitiesHostedCount" = "activitiesHostedCount" + 1
      WHERE "userId" = NEW."authorUserId";
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE "Profile" SET "activitiesHostedCount" = "activitiesHostedCount" - 1
      WHERE "userId" = OLD."authorUserId";
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER activity_hosted_count
AFTER INSERT OR DELETE ON "Activity"
FOR EACH ROW
EXECUTE FUNCTION sync_activity_hosted_count();
