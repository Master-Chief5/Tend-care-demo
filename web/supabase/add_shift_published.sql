-- ============================================================================
-- Tend Care — SHIFT PUBLISH STATE  (additive; idempotent)
-- Run AFTER the base schema that defines the `shifts` table.
--
-- Adds one column to `shifts`:
--   • published_at timestamptz — NULL = draft, a timestamp = published.
--     A schedule "week" is considered Published once every non-open shift in
--     that week/house scope carries a published_at; publishing stamps now() on
--     all of them at once (powers the desktop "Publish week" button).
--
-- The open-shift CLAIM flow needs no schema change: claiming an open shift just
-- updates the existing staff_id / person_name / status columns (status flips
-- from 'open' back to the normal 'scheduled').
-- Re-runnable: uses IF NOT EXISTS.
-- ============================================================================

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS published_at timestamptz;
