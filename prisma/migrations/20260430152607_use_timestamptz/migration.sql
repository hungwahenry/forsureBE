-- Convert every DateTime column to TIMESTAMPTZ(3). Existing values are
-- interpreted as UTC explicitly so this migration is correct regardless of
-- which session timezone the runner has.

ALTER TABLE "User"
  ALTER COLUMN "emailVerifiedAt" TYPE TIMESTAMPTZ(3) USING "emailVerifiedAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "onboardingCompletedAt" TYPE TIMESTAMPTZ(3) USING "onboardingCompletedAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "lastLoginAt" TYPE TIMESTAMPTZ(3) USING "lastLoginAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';

ALTER TABLE "EmailVerification"
  ALTER COLUMN "expiresAt" TYPE TIMESTAMPTZ(3) USING "expiresAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "consumedAt" TYPE TIMESTAMPTZ(3) USING "consumedAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';

ALTER TABLE "RefreshToken"
  ALTER COLUMN "expiresAt" TYPE TIMESTAMPTZ(3) USING "expiresAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "revokedAt" TYPE TIMESTAMPTZ(3) USING "revokedAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "lastUsedAt" TYPE TIMESTAMPTZ(3) USING "lastUsedAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';

ALTER TABLE "Profile"
  ALTER COLUMN "dateOfBirth" TYPE TIMESTAMPTZ(3) USING "dateOfBirth" AT TIME ZONE 'UTC',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';

ALTER TABLE "Activity"
  ALTER COLUMN "startsAt" TYPE TIMESTAMPTZ(3) USING "startsAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';

ALTER TABLE "ActivityParticipant"
  ALTER COLUMN "joinedAt" TYPE TIMESTAMPTZ(3) USING "joinedAt" AT TIME ZONE 'UTC';
