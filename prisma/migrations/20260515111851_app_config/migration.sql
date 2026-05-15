-- CreateEnum
CREATE TYPE "ConfigValueType" AS ENUM ('INT', 'FLOAT', 'BOOLEAN', 'STRING');

-- CreateTable
CREATE TABLE "AppConfig" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "defaultValue" JSONB NOT NULL,
    "valueType" "ConfigValueType" NOT NULL,
    "minValue" DOUBLE PRECISION,
    "maxValue" DOUBLE PRECISION,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "AppConfig_category_idx" ON "AppConfig"("category");

-- Seed the config catalog. The DB is the source of truth from here on.
INSERT INTO "AppConfig" ("key","value","defaultValue","valueType","minValue","maxValue","category","label","description","updatedAt") VALUES
('boost.free_per_cycle','4','4','INT',0,100,'Boosts','Free boosts per cycle','Activity boosts included free in each subscription cycle before overage charges apply.',NOW()),
('boost.overage_cents','1900','1900','INT',0,100000,'Boosts','Boost overage price (cents)','Charge per activity boost beyond the free per-cycle allowance.',NOW()),
('boost.duration_hours','72','72','INT',1,720,'Boosts','Boost duration (hours)','How long a boost stays live before it naturally ends.',NOW()),
('boost.cycle_window_days','30','30','INT',1,365,'Boosts','Boost cycle window (days)','Rolling window used to count boosts toward the free allowance.',NOW()),
('venue.pick_price_cents','500','500','INT',0,100000,'Venue picks','Confirmed-pick price (cents)','Charge when an activity is confirmed at a sponsored venue.',NOW()),
('venue.pick_dedupe_window_days','30','30','INT',1,365,'Venue picks','Pick dedupe window (days)','Same user + same venue is charged at most once within this window.',NOW()),
('venue.photo_max','10','10','INT',1,50,'Venues','Max venue photos','Maximum photos a business can attach to one venue.',NOW()),
('venue.auto_pause_reporter_threshold','3','3','INT',1,100,'Venues','Auto-pause reporter threshold','Distinct users flagging a business''s venues that triggers an auto-pause.',NOW()),
('venue.auto_pause_window_days','30','30','INT',1,365,'Venues','Auto-pause window (days)','Window over which distinct venue-flag reporters are counted.',NOW()),
('activity.min_lead_time_minutes','30','30','INT',0,10080,'Activities','Minimum lead time (minutes)','How far in the future an activity must start when created or edited.',NOW()),
('activity.max_concurrent_per_user','10','10','INT',1,100,'Activities','Max concurrent activities','Open activities a single user can be part of at once.',NOW()),
('activity.auto_done_after_hours','24','24','INT',1,720,'Activities','Auto-done after (hours)','Hours past start time before an activity is automatically marked DONE.',NOW()),
('post.window_days','7','7','INT',1,365,'Posts','Post window (days)','Days after an activity starts during which participants can post memories.',NOW()),
('suggestions.max_results','3','3','INT',0,20,'Feed & Suggestions','Max venue suggestions','Sponsored venue suggestions shown above organic place-picker results.',NOW()),
('feed.organic_per_sponsored','5','5','INT',1,50,'Feed & Suggestions','Organic per sponsored','Organic feed items shown between each sponsored boost slot.',NOW()),
('feed.boosts_per_page','3','3','INT',0,20,'Feed & Suggestions','Boosts per feed page','Maximum boosted activities interleaved into one feed page.',NOW()),
('analytics.venue_window_days','30','30','INT',1,365,'Analytics','Venue analytics window (days)','Default look-back window for per-venue analytics.',NOW()),
('analytics.business_window_days','30','30','INT',1,365,'Analytics','Business analytics window (days)','Default look-back window for business-wide analytics.',NOW()),
('analytics.dormant_threshold_days','30','30','INT',1,365,'Analytics','Dormant venue threshold (days)','Days without a pick before a venue is flagged dormant.',NOW()),
('analytics.explore_window_days','30','30','INT',1,365,'Analytics','Explore window (days)','Look-back window for the public memories explore feed.',NOW()),
('analytics.venue_activity_list_limit','20','20','INT',1,200,'Analytics','Venue activity list limit','Rows returned in the per-venue recent-activity list.',NOW()),
('auth.otp_ttl_minutes','10','10','INT',1,60,'Auth','OTP lifetime (minutes)','How long a one-time code stays valid after it is sent.',NOW()),
('auth.otp_max_attempts','5','5','INT',1,20,'Auth','OTP max attempts','Wrong-code attempts allowed before a code is burned.',NOW()),
('auth.otp_resend_cooldown_seconds','60','60','INT',0,3600,'Auth','OTP resend cooldown (seconds)','Minimum gap between consecutive code requests for the same target.',NOW()),
('account.export_request_cooldown_hours','24','24','INT',0,720,'Account','Export request cooldown (hours)','Minimum gap between a user''s data-export requests.',NOW()),
('account.export_download_ttl_hours','24','24','INT',1,720,'Account','Export download TTL (hours)','How long a generated data-export download link stays valid.',NOW()),
('onboarding.min_age_years','18','18','INT',13,100,'Onboarding','Minimum age (years)','Minimum age required to complete onboarding.',NOW());
