-- Drop is_secret column from secrets table
-- All variables are now treated as secrets by default (always encrypted)

ALTER TABLE secrets DROP COLUMN IF EXISTS is_secret;
