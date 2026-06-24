-- ============================================================================
-- Tend Care — INCIDENT INVESTIGATION fields  (additive, idempotent)
-- Run AFTER add_tables.sql (which creates the incidents table).
--
-- Extends the existing `incidents` table with the data a supervisor needs to
-- investigate a serious / reportable incident and document the resolution:
--   • witnesses           — who witnessed the event (free text / names)
--   • involved_persons     — residents / staff / others involved
--   • investigation_notes  — narrative of the investigation
--   • recommendations      — recommended corrective / preventive steps
--   • ane_flag             — abuse / neglect / exploitation classification
--                            (None | Abuse | Neglect | Exploitation); any of
--                            the latter three auto-flags the incident High/serious
--   • investigator         — name of the assigned investigator (reviewer stamp)
--   • investigated_at      — when the investigation was last saved
--
-- All columns are ADD COLUMN IF NOT EXISTS so this is safe to re-run and does
-- not touch existing incident rows or other columns.
-- ============================================================================

ALTER TABLE incidents ADD COLUMN IF NOT EXISTS witnesses           text;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS involved_persons    text;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS investigation_notes text;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS recommendations     text;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS ane_flag            text;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS investigator        text;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS investigated_at     timestamptz;
