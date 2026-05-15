-- Expose pricing/window keys that the business portal and mobile app mirror in copy.
UPDATE "AppConfig" SET "clientExposed" = true
WHERE "key" IN (
  'venue.pick_price_cents',
  'venue.pick_dedupe_window_days',
  'boost.overage_cents',
  'boost.free_per_cycle',
  'boost.duration_hours',
  'analytics.dormant_threshold_days',
  'account.export_download_ttl_hours'
);
