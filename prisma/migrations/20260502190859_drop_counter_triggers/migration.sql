-- Removing DB-level counter triggers; counters are now maintained at the
-- service layer so the logic is greppable and lives next to the code that
-- mutates the underlying rows.
DROP TRIGGER IF EXISTS activity_participant_counts ON "ActivityParticipant";
DROP FUNCTION IF EXISTS sync_activity_participant_counts();
DROP FUNCTION IF EXISTS sync_activity_hosted_count();
