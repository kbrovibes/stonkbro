-- Privacy lock: per-user PIN that gates unmasking of wealth-revealing values.
-- The PIN itself is set from the Settings page; never returned by /api/settings.
alter table user_settings add column if not exists privacy_pin text;
