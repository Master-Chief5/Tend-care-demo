-- ============================================================================
-- Tend Care — SHIFT REQUIRED CERTIFICATION  (additive; idempotent)
-- Run AFTER the base schema that defines the `shifts` table.
--
-- Adds one column to `shifts`:
--   • required_cert text — NULL = no cert gate. When set (e.g. 'Medication
--     Administration'), the scheduler cross-checks each candidate staffer's
--     certifications and warns (does not hard-block) when the matching cert is
--     missing or expired. Common values: 'Medication Administration',
--     'CPR / First Aid', 'First Aid'.
--
-- Re-runnable: uses IF NOT EXISTS.
-- ============================================================================

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS required_cert text;
