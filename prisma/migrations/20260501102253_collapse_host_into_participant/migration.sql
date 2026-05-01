-- Collapses the host-vs-participant duality into a single ActivityParticipant
-- table with a `role` enum. The host becomes a Participant row with role=HOST,
-- created in the same transaction as the Activity. Drops Activity.authorUserId
-- and Activity.hostLastReadAt (the latter migrates onto the host's Participant
-- row as `lastReadAt`).

-- 1. New enum.
CREATE TYPE "ActivityRole" AS ENUM ('HOST', 'MEMBER');

-- 2. New column (default MEMBER so existing rows are valid).
ALTER TABLE "ActivityParticipant"
  ADD COLUMN "role" "ActivityRole" NOT NULL DEFAULT 'MEMBER';

CREATE INDEX "ActivityParticipant_activityId_role_idx"
  ON "ActivityParticipant"("activityId", "role");

-- 3. Drop the old triggers BEFORE we backfill, so synthetic INSERTs don't
--    double-count. We'll re-attach a single combined trigger at the end.
DROP TRIGGER IF EXISTS activity_participant_counts ON "ActivityParticipant";
DROP TRIGGER IF EXISTS activity_hosted_count ON "Activity";
DROP FUNCTION IF EXISTS sync_activity_participant_counts();
DROP FUNCTION IF EXISTS sync_activity_hosted_count();

-- 4. Backfill: every existing Activity gets a HOST Participant row mirroring
--    its authorUserId, with the host's lastReadAt copied from the column we
--    are about to drop.
INSERT INTO "ActivityParticipant" (id, "activityId", "userId", "role", "joinedAt", "lastReadAt")
SELECT
  'ap_' || replace(gen_random_uuid()::text, '-', ''),
  a.id,
  a."authorUserId",
  'HOST',
  a."createdAt",
  a."hostLastReadAt"
FROM "Activity" a;

-- 5. Enforce "exactly one HOST per activity" at the DB layer.
CREATE UNIQUE INDEX "ActivityParticipant_one_host_per_activity"
  ON "ActivityParticipant"("activityId")
  WHERE "role" = 'HOST';

-- 6. Recompute denormalized counters from the new model. Without active
--    triggers, this is the cleanest way to settle them in one pass.
UPDATE "Profile" p SET "activitiesHostedCount" = (
  SELECT COUNT(*) FROM "ActivityParticipant" ap
  WHERE ap."userId" = p."userId" AND ap."role" = 'HOST'
);

UPDATE "Profile" p SET "activitiesJoinedCount" = (
  SELECT COUNT(*) FROM "ActivityParticipant" ap
  WHERE ap."userId" = p."userId" AND ap."role" = 'MEMBER'
);

UPDATE "Activity" a SET "participantCount" = (
  SELECT COUNT(*) FROM "ActivityParticipant" ap
  WHERE ap."activityId" = a.id
);

-- 7. Drop the old denormalized columns now that the new model is fully populated.
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_authorUserId_fkey";
DROP INDEX "Activity_authorUserId_createdAt_idx";
ALTER TABLE "Activity"
  DROP COLUMN "authorUserId",
  DROP COLUMN "hostLastReadAt";

-- 8. Single combined trigger: on Participant INSERT/DELETE, bump
--    Activity.participantCount unconditionally and bump the right Profile
--    counter based on role.
CREATE OR REPLACE FUNCTION sync_activity_participant_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE "Activity" SET "participantCount" = "participantCount" + 1
      WHERE id = NEW."activityId";
    IF NEW."role" = 'HOST' THEN
      UPDATE "Profile" SET "activitiesHostedCount" = "activitiesHostedCount" + 1
        WHERE "userId" = NEW."userId";
    ELSE
      UPDATE "Profile" SET "activitiesJoinedCount" = "activitiesJoinedCount" + 1
        WHERE "userId" = NEW."userId";
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE "Activity" SET "participantCount" = "participantCount" - 1
      WHERE id = OLD."activityId";
    IF OLD."role" = 'HOST' THEN
      UPDATE "Profile" SET "activitiesHostedCount" = "activitiesHostedCount" - 1
        WHERE "userId" = OLD."userId";
    ELSE
      UPDATE "Profile" SET "activitiesJoinedCount" = "activitiesJoinedCount" - 1
        WHERE "userId" = OLD."userId";
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER activity_participant_counts
AFTER INSERT OR DELETE ON "ActivityParticipant"
FOR EACH ROW
EXECUTE FUNCTION sync_activity_participant_counts();
