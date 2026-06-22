-- ============================================================================
-- Tend Care — RESIDENT PROGRESS NOTES  (additive; idempotent)
-- Run AFTER security_critical.sql, security_house_scoping.sql.
--
-- Adds one table:
--   • resident_notes — free-text progress / behavior / medical / general notes
--                      about a resident, written by staff over time. These are
--                      the raw material aggregated into a resident's progress
--                      report for a date range.
--
-- RLS is house-scoped (mirrors shift_doc_progress / security_house_scoping):
--   • supervisor → full org access
--   • manager / DSP → own house (plus org-wide rows where house_id IS NULL)
-- DSPs CAN write their own house's notes (INSERT/UPDATE/DELETE share the SELECT
-- predicate), since documenting resident progress is their job.
-- Depends on the SECURITY DEFINER helpers auth_org_id(), auth_staff_id(),
-- auth_staff_role(), auth_house_id() from security_critical.sql.
-- Re-runnable: table uses IF NOT EXISTS; every policy is dropped & recreated.
-- ============================================================================

-- ── resident_notes ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resident_notes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id       uuid REFERENCES houses(id) ON DELETE SET NULL,
  resident_id    uuid,                                 -- references residents(id); stored as plain uuid (resident may be deleted), nullable
  resident_name  text,
  category       text NOT NULL DEFAULT 'progress',     -- 'progress' | 'behavior' | 'medical' | 'general'
  body           text NOT NULL,
  author_name    text,
  author_role    text,
  note_date      date NOT NULL DEFAULT current_date,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS resident_notes_org_house_resident_date_idx
  ON resident_notes (org_id, house_id, resident_id, note_date);

ALTER TABLE resident_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resident_notes_select" ON resident_notes;
DROP POLICY IF EXISTS "resident_notes_insert" ON resident_notes;
DROP POLICY IF EXISTS "resident_notes_update" ON resident_notes;
DROP POLICY IF EXISTS "resident_notes_delete" ON resident_notes;

CREATE POLICY "resident_notes_select" ON resident_notes FOR SELECT USING (
  org_id = auth_org_id() AND (auth_staff_role() = 'supervisor' OR house_id IS NULL OR house_id = auth_house_id())
);
CREATE POLICY "resident_notes_insert" ON resident_notes FOR INSERT WITH CHECK (
  org_id = auth_org_id() AND (auth_staff_role() = 'supervisor' OR house_id IS NULL OR house_id = auth_house_id())
);
CREATE POLICY "resident_notes_update" ON resident_notes FOR UPDATE USING (
  org_id = auth_org_id() AND (auth_staff_role() = 'supervisor' OR house_id IS NULL OR house_id = auth_house_id())
) WITH CHECK (
  org_id = auth_org_id() AND (auth_staff_role() = 'supervisor' OR house_id IS NULL OR house_id = auth_house_id())
);
CREATE POLICY "resident_notes_delete" ON resident_notes FOR DELETE USING (
  org_id = auth_org_id() AND (auth_staff_role() = 'supervisor' OR house_id IS NULL OR house_id = auth_house_id())
);
