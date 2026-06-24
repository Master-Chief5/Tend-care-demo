-- ============================================================================
-- Tend Care — INCIDENT occurrence time + photo  (additive, idempotent)
-- Run AFTER add_meds_log_compliance.sql (which creates the incidents table).
--
-- Extends the existing `incidents` table with:
--   • occurred_at  — when the incident actually happened, separate from the
--                    auto-stamped report date (incident_date / created_at)
--   • photo        — an optional attachment (data URL or image URL)
--
-- Both columns are ADD COLUMN IF NOT EXISTS so this is safe to re-run and does
-- not touch existing incident rows or other columns.
-- ============================================================================

ALTER TABLE incidents ADD COLUMN IF NOT EXISTS occurred_at timestamptz;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS photo       text;
