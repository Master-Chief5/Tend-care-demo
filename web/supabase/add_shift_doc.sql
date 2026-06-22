-- ============================================================================
-- Tend Care — GUIDED SHIFT DOCUMENTATION progress  (additive; idempotent)
-- Run AFTER security_critical.sql, security_house_scoping.sql.
--
-- Adds one table:
--   • shift_doc_progress — tracks, per resident per shift-date, which care
--                          documentation sections have been completed (done) or
--                          explicitly marked not-applicable (na). The absence of
--                          a row means the section is still "to do". This powers
--                          a shift's "did this get done" overview.
--
-- RLS is house-scoped (mirrors time_off_requests / security_house_scoping):
--   • supervisor → full org access
--   • manager / DSP → own house (plus org-wide rows where house_id IS NULL)
-- DSPs CAN write their own house's docs (INSERT/UPDATE/DELETE share the SELECT
-- predicate), since documenting a shift is their job.
-- Depends on the SECURITY DEFINER helpers auth_org_id(), auth_staff_id(),
-- auth_staff_role(), auth_house_id() from security_critical.sql.
-- Re-runnable: table uses IF NOT EXISTS; every policy is dropped & recreated.
-- ============================================================================

-- ── shift_doc_progress ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shift_doc_progress (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id       uuid REFERENCES houses(id) ON DELETE SET NULL,
  shift_date     date NOT NULL,
  resident_id    uuid,                                 -- references residents(id); stored as plain uuid (resident may be deleted), nullable
  resident_name  text,
  section        text NOT NULL,                        -- 'log' | 'health' | 'goals' | 'meds' | 'incident'
  status         text NOT NULL DEFAULT 'done',         -- 'done' | 'na'
  done_by_name   text,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (house_id, shift_date, resident_id, section)
);

CREATE INDEX IF NOT EXISTS shift_doc_progress_org_house_date_idx
  ON shift_doc_progress (org_id, house_id, shift_date);

ALTER TABLE shift_doc_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shift_doc_progress_select" ON shift_doc_progress;
DROP POLICY IF EXISTS "shift_doc_progress_insert" ON shift_doc_progress;
DROP POLICY IF EXISTS "shift_doc_progress_update" ON shift_doc_progress;
DROP POLICY IF EXISTS "shift_doc_progress_delete" ON shift_doc_progress;

CREATE POLICY "shift_doc_progress_select" ON shift_doc_progress FOR SELECT USING (
  org_id = auth_org_id() AND (auth_staff_role() = 'supervisor' OR house_id IS NULL OR house_id = auth_house_id())
);
CREATE POLICY "shift_doc_progress_insert" ON shift_doc_progress FOR INSERT WITH CHECK (
  org_id = auth_org_id() AND (auth_staff_role() = 'supervisor' OR house_id IS NULL OR house_id = auth_house_id())
);
CREATE POLICY "shift_doc_progress_update" ON shift_doc_progress FOR UPDATE USING (
  org_id = auth_org_id() AND (auth_staff_role() = 'supervisor' OR house_id IS NULL OR house_id = auth_house_id())
) WITH CHECK (
  org_id = auth_org_id() AND (auth_staff_role() = 'supervisor' OR house_id IS NULL OR house_id = auth_house_id())
);
CREATE POLICY "shift_doc_progress_delete" ON shift_doc_progress FOR DELETE USING (
  org_id = auth_org_id() AND (auth_staff_role() = 'supervisor' OR house_id IS NULL OR house_id = auth_house_id())
);
